  /* ═══════════════════════════════════════════════════
     导出引擎 v5.5 — 纯页面渲染混合导出
     ═══════════════════════════════════════════════════

     v5.5 核心改进：
     1. 导出只依赖页面内渲染，不再请求系统截图/共享权限。
     2. 普通主题优先走单通道，避免导出链路自己破坏玻璃面层、渐变底图和标签色块。
     3. ops-console 保留稳定底稿 + 前景叠加，继续修正 tech 网格、内框线和标签底板。
     4. html2canvas 仍配合 SVG var() 预解析等补丁工作。
     5. 所有临时修改通过逆序恢复栈 + try/finally 保护。
     ═══════════════════════════════════════════════════ */

  /** 需要强制内联的视觉属性列表 */
  var VISUAL_PROPS = [
    'backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat',
    'backgroundClip', 'backgroundOrigin', 'backgroundBlendMode',
    'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
    'borderTopStyle', 'borderRightStyle', 'borderBottomStyle', 'borderLeftStyle',
    'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius',
    'boxShadow', 'filter', 'mixBlendMode', 'color', 'opacity'
  ];

  /** 伪元素需要复制的样式属性 */
  var PSEUDO_PROPS = [
    'position', 'top', 'right', 'bottom', 'left', 'transform', 'transformOrigin',
    'display', 'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
    'backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat',
    'backgroundClip', 'backgroundOrigin', 'backgroundBlendMode',
    'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
    'borderTopStyle', 'borderRightStyle', 'borderBottomStyle', 'borderLeftStyle',
    'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius',
    'boxShadow', 'filter', 'mixBlendMode', 'maskImage', 'maskSize', 'maskPosition', 'maskRepeat',
    'webkitMaskImage', 'webkitMaskSize', 'webkitMaskPosition', 'webkitMaskRepeat',
    'opacity', 'zIndex', 'overflow',
    'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'boxSizing'
  ];

  var SHADOW_BORDER_FALLBACK_SELECTORS = [
    '.wx-eyebrow',
    '.wx-card-caption',
    '.wx-section-icon',
    '.phone-brand-mark'
  ].join(', ');

  var OPS_CONSOLE_CARD_SELECTORS = [
    '.article-theme[data-style-family="ops-console"] .wx-hero-card',
    '.article-theme[data-style-family="ops-console"] .wx-intro-card',
    '.article-theme[data-style-family="ops-console"] .wx-section-card',
    '.article-theme[data-style-family="ops-console"] .wx-metric-card',
    '.article-theme[data-style-family="ops-console"] .wx-compare-card'
  ].join(', ');

  var OPS_CONSOLE_FRAME_SELECTORS = [
    '.article-theme[data-style-family="ops-console"] .wx-hero-card',
    '.article-theme[data-style-family="ops-console"] .wx-section-card'
  ].join(', ');

  var OPS_CONSOLE_CHIP_SELECTORS = [
    '.article-theme[data-style-family="ops-console"] .wx-eyebrow',
    '.article-theme[data-style-family="ops-console"] .wx-card-caption',
    '.article-theme[data-style-family="ops-console"] .wx-section-icon',
    '.article-theme[data-style-family="ops-console"] .wx-section-index'
  ].join(', ');

  var TECH_GRID_SELECTORS = [
    '.article-theme.style-skin-tech .wx-hero-card',
    '.article-theme.style-skin-tech .wx-section-card'
  ].join(', ');

  var EXPORT_SURFACE_SELECTORS = [
    '.article-theme .wx-hero-card',
    '.article-theme .wx-intro-card',
    '.article-theme .wx-section-card',
    '.article-theme .wx-metric-card',
    '.article-theme .wx-compare-card',
    '.article-theme .wx-timeline-card',
    '.article-theme .wx-quote-card',
    '.article-theme .wx-summary-card',
    '.article-theme .wx-inline-graphic',
    '.article-theme .wx-badge-art'
  ].join(', ');

  var EXPORT_CHIP_SELECTORS = [
    '.article-theme .wx-eyebrow',
    '.article-theme .wx-card-caption',
    '.article-theme .wx-pill',
    '.article-theme .wx-section-icon',
    '.article-theme .wx-section-index',
    '.article-theme .wx-section-body blockquote'
  ].join(', ');

  function scopeSelectorList(selectors, scope) {
    return selectors.split(',').map(function (selector) {
      return scope + ' ' + selector.trim();
    }).join(',\n');
  }

  function getCurrentThemeEl() {
    return editorEl ? editorEl.querySelector('.article-theme') : null;
  }

  function shouldUseSplitPassExport() {
    var themeEl = getCurrentThemeEl();
    if (!themeEl) return false;
    return themeEl.getAttribute('data-style-family') === 'ops-console';
  }

  function getColorAlpha(value) {
    if (!value || value === 'transparent') return 0;
    var rgbaMatch = value.match(/rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)/i);
    if (rgbaMatch) return parseFloat(rgbaMatch[1]);
    if (/^rgb\(/i.test(value)) return 1;
    return null;
  }

  function setInlineStyleProperty(el, prop, value, restoreOps) {
    var saved = el.style[prop] || '';
    if (saved === value) return;
    el.style[prop] = value;
    restoreOps.push(function () {
      el.style[prop] = saved;
    });
  }

  function applyPageBackgroundForExport(restoreOps) {
    if (!editorEl) return;
    var sourceEl = document.body || document.documentElement;
    if (!sourceEl) return;

    try {
      var cs = getComputedStyle(sourceEl);
      [
        'backgroundColor',
        'backgroundImage',
        'backgroundSize',
        'backgroundPosition',
        'backgroundRepeat',
        'backgroundAttachment',
        'backgroundOrigin',
        'backgroundClip',
        'backgroundBlendMode'
      ].forEach(function (prop) {
        var value = cs[prop];
        if (value !== undefined && value !== '') {
          setInlineStyleProperty(editorEl, prop, value, restoreOps);
        }
      });
    } catch (e) {}
  }

  /**
   * 收集页面上所有 :root CSS 变量的计算值
   */
  function collectCssVars() {
    var computed = getComputedStyle(document.documentElement);
    var vars = {};
    for (var s = 0; s < document.styleSheets.length; s++) {
      try {
        var rules = document.styleSheets[s].cssRules || [];
        for (var r = 0; r < rules.length; r++) {
          if (rules[r].selectorText === ':root') {
            var txt = rules[r].cssText;
            var re = /--([\w-]+)/g; var m;
            while ((m = re.exec(txt)) !== null) {
              var name = '--' + m[1];
              var val = computed.getPropertyValue(name).trim();
              if (val) vars[name] = val;
            }
          }
        }
      } catch (e) {}
    }
    return vars;
  }

  /**
   * 判断元素是否在 SVG 子树中
   */
  function isInsideSvg(el) {
    return el.tagName === 'svg' || el.tagName === 'SVG' ||
           (el.closest && el.closest('svg'));
  }

  function getRenderPassStyleText(passMode) {
    if (passMode === 'foreground') {
      return [
        '[data-tp-exporting="foreground"] *::before,',
        '[data-tp-exporting="foreground"] *::after {',
        '  content: none !important;',
        '  background: none !important;',
        '  border: 0 !important;',
        '  box-shadow: none !important;',
        '}',
        scopeSelectorList(EXPORT_SURFACE_SELECTORS, '[data-tp-exporting="foreground"]') + ' {',
        '  background: transparent !important;',
        '  background-image: none !important;',
        '  box-shadow: none !important;',
        '  border-color: transparent !important;',
        '  backdrop-filter: none !important;',
        '  -webkit-backdrop-filter: none !important;',
        '}',
        scopeSelectorList(EXPORT_CHIP_SELECTORS, '[data-tp-exporting="foreground"]') + ' {',
        '  background: transparent !important;',
        '  background-image: none !important;',
        '  box-shadow: none !important;',
        '  border-color: transparent !important;',
        '  border-left-color: transparent !important;',
        '}',
        scopeSelectorList(OPS_CONSOLE_CARD_SELECTORS, '[data-tp-exporting="foreground"]') + ' {',
        '  background: transparent !important;',
        '  background-image: none !important;',
        '  box-shadow: none !important;',
        '  border-color: transparent !important;',
        '}',
        '[data-tp-exporting="foreground"] .article-theme[data-style-family="ops-console"] .wx-hero-card::before,',
        '[data-tp-exporting="foreground"] .article-theme[data-style-family="ops-console"] .wx-section-card::before,',
        '[data-tp-exporting="foreground"] .article-theme.style-skin-tech .wx-hero-card::after,',
        '[data-tp-exporting="foreground"] .article-theme.style-skin-tech .wx-section-card::after {',
        '  content: none !important;',
        '  background: none !important;',
        '  border: 0 !important;',
        '  box-shadow: none !important;',
        '}',
        scopeSelectorList(OPS_CONSOLE_CHIP_SELECTORS, '[data-tp-exporting="foreground"]') + ' {',
        '  background: transparent !important;',
        '  background-image: none !important;',
        '  box-shadow: none !important;',
        '  border-color: transparent !important;',
        '}'
      ].join('\n');
    }

    if (passMode === 'base') {
      return [
        scopeSelectorList(OPS_CONSOLE_CARD_SELECTORS, '[data-tp-exporting="base"]') + ' {',
        '  background: linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(245, 248, 255, 0.86)) !important;',
        '  background-size: auto !important;',
        '  box-shadow: 0 16px 40px rgba(34, 57, 112, 0.12) !important;',
        '}',
        '[data-tp-exporting="base"] .article-theme[data-style-family="ops-console"] .wx-hero-card::before,',
        '[data-tp-exporting="base"] .article-theme[data-style-family="ops-console"] .wx-section-card::before,',
        '[data-tp-exporting="base"] .article-theme.style-skin-tech .wx-hero-card::after,',
        '[data-tp-exporting="base"] .article-theme.style-skin-tech .wx-section-card::after {',
        '  content: none !important;',
        '  background: none !important;',
        '  border: 0 !important;',
        '  box-shadow: none !important;',
        '}',
        scopeSelectorList(OPS_CONSOLE_CHIP_SELECTORS, '[data-tp-exporting="base"]') + ' {',
        '  box-shadow: none !important;',
        '  border: 1px solid rgba(79, 123, 255, 0.10) !important;',
        '}'
      ].join('\n');
    }

    return '';
  }

  /**
   * 导出前的全面 DOM 准备，返回 restore 函数。
   * 核心策略：将浏览器已解析的计算样式全部内联，
   * 让 html2canvas 无需依赖 CSS 变量解析即可正确渲染。
   */
  function prepareForExport(passMode) {
    var vars = collectCssVars();
    var restoreOps = [];
    var pseudoRuleBlocks = [];
    var isSinglePass = passMode === 'single';

    // ────── 0) 冻结 transition/animation ──────
    var freezeStyle = document.createElement('style');
    freezeStyle.id = 'tianphoto-export-freeze';
    freezeStyle.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; }';
    document.head.appendChild(freezeStyle);
    restoreOps.push(function () {
      if (freezeStyle.parentNode) freezeStyle.parentNode.removeChild(freezeStyle);
    });

    var pseudoSuppressStyle = document.createElement('style');
    pseudoSuppressStyle.id = 'tianphoto-export-pseudo-suppress';
    document.head.appendChild(pseudoSuppressStyle);
    restoreOps.push(function () {
      if (pseudoSuppressStyle.parentNode) pseudoSuppressStyle.parentNode.removeChild(pseudoSuppressStyle);
    });

    var exportModeStyle = document.createElement('style');
    exportModeStyle.id = 'tianphoto-export-mode';
    exportModeStyle.textContent = getRenderPassStyleText(passMode);
    document.head.appendChild(exportModeStyle);
    document.documentElement.setAttribute('data-tp-exporting', passMode || 'default');
    restoreOps.push(function () {
      document.documentElement.removeAttribute('data-tp-exporting');
      if (exportModeStyle.parentNode) exportModeStyle.parentNode.removeChild(exportModeStyle);
    });

    // ────── 1) 移除 contenteditable（消除光标、选区高亮）──────
    var editorWasEditable = editorEl.getAttribute('contenteditable');
    if (editorWasEditable) {
      editorEl.removeAttribute('contenteditable');
      restoreOps.push(function () { editorEl.setAttribute('contenteditable', editorWasEditable); });
    }
    editorEl.querySelectorAll('[contenteditable]').forEach(function (el) {
      var val = el.getAttribute('contenteditable');
      el.removeAttribute('contenteditable');
      restoreOps.push(function () { el.setAttribute('contenteditable', val); });
    });

    if (passMode !== 'foreground') {
      applyPageBackgroundForExport(restoreOps);
    }

    // ────── 2) 物化伪元素 ::before / ::after ──────
    // 前景 pass 只保留正文内容，避免装饰层重复叠加。
    if (passMode !== 'foreground' && !isSinglePass) {
      var pseudoTargets = Array.from(editorEl.querySelectorAll('*'));
      pseudoTargets.forEach(function (el) {
        if (isInsideSvg(el)) return;
        [':before', ':after'].forEach(function (pseudo) {
          try {
            var cs = getComputedStyle(el, pseudo);
            var content = cs.getPropertyValue('content');
            if (!content || content === 'none' || content === 'normal') return;

            var display = cs.getPropertyValue('display');
            if (display === 'none') return;

            var bgImage = cs.getPropertyValue('background-image');
            var bgColor = cs.getPropertyValue('background-color');
            var borderW = parseFloat(cs.getPropertyValue('border-top-width')) +
                          parseFloat(cs.getPropertyValue('border-right-width')) +
                          parseFloat(cs.getPropertyValue('border-bottom-width')) +
                          parseFloat(cs.getPropertyValue('border-left-width'));
            var hasText = content !== '""' && content !== "''";
            var hasBg = (bgImage && bgImage !== 'none') ||
                        (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent');
            var hasBorder = borderW > 0;

            if (!hasText && !hasBg && !hasBorder) return;

            var node = document.createElement('span');
            node.setAttribute('data-tp-pseudo', pseudo);
            node.style.pointerEvents = 'none';

            PSEUDO_PROPS.forEach(function (prop) {
              try {
                var val = cs[prop];
                if (val !== undefined && val !== '') node.style[prop] = val;
              } catch (e) {}
            });

            if (hasText) {
              var text = content.replace(/^["']|["']$/g, '');
              if (text) {
                node.textContent = text;
                try {
                  node.style.fontSize = cs.fontSize;
                  node.style.fontWeight = cs.fontWeight;
                  node.style.fontFamily = cs.fontFamily;
                  node.style.fontStyle = cs.fontStyle;
                  node.style.letterSpacing = cs.letterSpacing;
                  node.style.lineHeight = cs.lineHeight;
                  node.style.textAlign = cs.textAlign;
                  node.style.textTransform = cs.textTransform;
                  node.style.color = cs.color;
                } catch (e) {}
              }
            }

            if (pseudo === ':before') {
              el.setAttribute('data-tp-hide-before', 'true');
              pseudoRuleBlocks.push('[data-tp-hide-before="true"]::before { content: none !important; background: none !important; border: 0 !important; box-shadow: none !important; }');
              restoreOps.push(function () { el.removeAttribute('data-tp-hide-before'); });
              el.insertBefore(node, el.firstChild);
            } else {
              el.setAttribute('data-tp-hide-after', 'true');
              pseudoRuleBlocks.push('[data-tp-hide-after="true"]::after { content: none !important; background: none !important; border: 0 !important; box-shadow: none !important; }');
              restoreOps.push(function () { el.removeAttribute('data-tp-hide-after'); });
              el.appendChild(node);
            }

            restoreOps.push(function () {
              if (node.parentNode) node.parentNode.removeChild(node);
            });
          } catch (e) {}
        });
      });
    }

    if (pseudoRuleBlocks.length) {
      pseudoSuppressStyle.textContent = Array.from(new Set(pseudoRuleBlocks)).join('\n');
    }

    // ────── 3) 强制内联所有计算后的视觉样式 ──────
    // html2canvas 可能无法正确解析 CSS 自定义属性（var()），
    // 将浏览器已计算的最终值直接写入 inline style 确保渲染正确
    if (!isSinglePass) {
      var allElements = [editorEl].concat(Array.from(editorEl.querySelectorAll('*')));
      allElements.forEach(function (el) {
        if (isInsideSvg(el)) return; // SVG 元素用属性不用 CSS，在步骤 4 单独处理
        try {
          var cs = getComputedStyle(el);
          var saved = {};
          var changed = false;
          VISUAL_PROPS.forEach(function (prop) {
            try {
              var val = cs[prop];
              if (val !== undefined && val !== '') {
                saved[prop] = el.style[prop] || '';
                el.style[prop] = val;
                changed = true;
              }
            } catch (e) {}
          });
          if (changed) {
            restoreOps.push(function () {
              Object.keys(saved).forEach(function (prop) {
                el.style[prop] = saved[prop];
              });
            });
          }
        } catch (e) {}
      });
    }

    // ────── 3.5) 将 html2canvas 不支持的简单内阴影轮廓转成真实边框 ──────
    if (passMode !== 'foreground' && !isSinglePass) {
      editorEl.querySelectorAll(SHADOW_BORDER_FALLBACK_SELECTORS).forEach(function (el) {
        try {
          var cs = getComputedStyle(el);
          var fallback = parseSimpleOutlineShadow(cs.boxShadow);
          if (!fallback) return;
          var saved = {
            borderTopWidth: el.style.borderTopWidth || '',
            borderRightWidth: el.style.borderRightWidth || '',
            borderBottomWidth: el.style.borderBottomWidth || '',
            borderLeftWidth: el.style.borderLeftWidth || '',
            borderTopStyle: el.style.borderTopStyle || '',
            borderRightStyle: el.style.borderRightStyle || '',
            borderBottomStyle: el.style.borderBottomStyle || '',
            borderLeftStyle: el.style.borderLeftStyle || '',
            borderTopColor: el.style.borderTopColor || '',
            borderRightColor: el.style.borderRightColor || '',
            borderBottomColor: el.style.borderBottomColor || '',
            borderLeftColor: el.style.borderLeftColor || '',
            boxSizing: el.style.boxSizing || ''
          };
          el.style.borderTopWidth = fallback.spread + 'px';
          el.style.borderRightWidth = fallback.spread + 'px';
          el.style.borderBottomWidth = fallback.spread + 'px';
          el.style.borderLeftWidth = fallback.spread + 'px';
          el.style.borderTopStyle = 'solid';
          el.style.borderRightStyle = 'solid';
          el.style.borderBottomStyle = 'solid';
          el.style.borderLeftStyle = 'solid';
          el.style.borderTopColor = fallback.color;
          el.style.borderRightColor = fallback.color;
          el.style.borderBottomColor = fallback.color;
          el.style.borderLeftColor = fallback.color;
          el.style.boxSizing = 'border-box';
          restoreOps.push(function () {
            el.style.borderTopWidth = saved.borderTopWidth;
            el.style.borderRightWidth = saved.borderRightWidth;
            el.style.borderBottomWidth = saved.borderBottomWidth;
            el.style.borderLeftWidth = saved.borderLeftWidth;
            el.style.borderTopStyle = saved.borderTopStyle;
            el.style.borderRightStyle = saved.borderRightStyle;
            el.style.borderBottomStyle = saved.borderBottomStyle;
            el.style.borderLeftStyle = saved.borderLeftStyle;
            el.style.borderTopColor = saved.borderTopColor;
            el.style.borderRightColor = saved.borderRightColor;
            el.style.borderBottomColor = saved.borderBottomColor;
            el.style.borderLeftColor = saved.borderLeftColor;
            el.style.boxSizing = saved.boxSizing;
          });
        } catch (e) {}
      });
    }

    // ────── 4) 预解析 SVG 属性中的 var() ──────
    // SVG fill/stroke/stop-color 等是 XML 属性而非 CSS 属性，
    // html2canvas 完全无法解析它们中的 var() 引用
    editorEl.querySelectorAll('svg').forEach(function (svg) {
      var original = svg.innerHTML;
      var patched = original.replace(/var\(\s*(--[\w-]+)\s*\)/g, function (match, name) {
        return vars[name] || match;
      });
      if (patched !== original) {
        svg.innerHTML = patched;
        restoreOps.push(function () { svg.innerHTML = original; });
      }
    });

    // ────── 5) 降级 backdrop-filter ──────
    // html2canvas 完全不支持 backdrop-filter
    if (passMode !== 'foreground' && !isSinglePass) {
      editorEl.querySelectorAll('*').forEach(function (el) {
        try {
          var cs = getComputedStyle(el);
          var bf = cs.getPropertyValue('backdrop-filter') || cs.getPropertyValue('-webkit-backdrop-filter');
          if (bf && bf !== 'none') {
            var origBd = el.style.backdropFilter || '';
            var origWbd = el.style.webkitBackdropFilter || '';
            var origBg = el.style.backgroundColor || '';
            var bg = cs.backgroundColor;
            var bgImage = cs.backgroundImage;
            var alpha = getColorAlpha(bg);
            if (bg && /rgba/.test(bg) && alpha !== null && alpha > 0 && alpha < 0.95 && (!bgImage || bgImage === 'none')) {
              el.style.backgroundColor = bg.replace(/,\s*[\d.]+\)$/, ', 0.95)');
            }
            el.style.backdropFilter = 'none';
            el.style.webkitBackdropFilter = 'none';
            restoreOps.push(function () {
              el.style.backdropFilter = origBd;
              el.style.webkitBackdropFilter = origWbd;
              el.style.backgroundColor = origBg;
            });
          }
        } catch (e) {}
      });
    }

    // ────── 6) 降级 -webkit-background-clip: text ──────
    // html2canvas 不支持渐变文字，降级为纯色
    editorEl.querySelectorAll('*').forEach(function (el) {
      try {
        var cs = getComputedStyle(el);
        var bgClip = cs.getPropertyValue('-webkit-background-clip') || cs.getPropertyValue('background-clip');
        if (bgClip === 'text') {
          var origClip = el.style.backgroundClip || '';
          var origWClip = el.style.webkitBackgroundClip || '';
          var origFill = el.style.webkitTextFillColor || '';
          var origColor = el.style.color || '';
          var origBgImg = el.style.backgroundImage || '';
          el.style.backgroundClip = 'border-box';
          el.style.webkitBackgroundClip = 'border-box';
          el.style.webkitTextFillColor = 'unset';
          el.style.color = vars['--accent-strong'] || cs.color;
          el.style.backgroundImage = 'none';
          restoreOps.push(function () {
            el.style.backgroundClip = origClip;
            el.style.webkitBackgroundClip = origWClip;
            el.style.webkitTextFillColor = origFill;
            el.style.color = origColor;
            el.style.backgroundImage = origBgImg;
          });
        }
      } catch (e) {}
    });

    return {
      restore: function () {
        for (var i = restoreOps.length - 1; i >= 0; i--) {
          try { restoreOps[i](); } catch (e) { console.warn('[Tianphoto] Restore error:', e); }
        }
      }
    };
  }

  function parseSimpleOutlineShadow(value) {
    if (!value || value === 'none') return null;
    var shadows = splitCssValueList(value);
    for (var i = 0; i < shadows.length; i++) {
      var parsed = parseSingleOutlineShadow(shadows[i]);
      if (parsed) return parsed;
    }
    return null;
  }

  function splitCssValueList(value) {
    var parts = [];
    var current = '';
    var depth = 0;
    for (var i = 0; i < value.length; i++) {
      var ch = value.charAt(i);
      if (ch === '(') depth++;
      if (ch === ')') depth = Math.max(0, depth - 1);
      if (ch === ',' && depth === 0) {
        if (current.trim()) parts.push(current.trim());
        current = '';
        continue;
      }
      current += ch;
    }
    if (current.trim()) parts.push(current.trim());
    return parts;
  }

  function parseSingleOutlineShadow(value) {
    if (!value) return null;
    var inset = /\binset\b/.test(value);
    var lengths = value.match(/-?\d*\.?\d+px/g) || [];
    if (lengths.length < 4) return null;
    var offsetX = parseFloat(lengths[0]);
    var offsetY = parseFloat(lengths[1]);
    var blur = parseFloat(lengths[2]);
    var spread = parseFloat(lengths[3]);
    if (Math.abs(offsetX) > 0.01 || Math.abs(offsetY) > 0.01 || Math.abs(blur) > 0.01 || spread <= 0 || spread > 2.5) {
      return null;
    }
    var color = value.replace(/\binset\b/g, '').trim();
    lengths.forEach(function (token) {
      color = color.replace(token, ' ');
    });
    color = color.replace(/\s+/g, ' ').trim();
    if (!color || color === 'none') return null;
    return {
      inset: inset,
      spread: spread,
      color: color
    };
  }

  async function waitForAnimationFrame() {
    await new Promise(function (resolve) { requestAnimationFrame(resolve); });
  }

  function getExportGeometry() {
    var rect = editorEl.getBoundingClientRect();
    var width = rect.width || MOBILE_WIDTH;
    var height = rect.height || editorEl.scrollHeight || 1;
    return {
      left: rect.left,
      top: rect.top,
      width: width,
      height: height,
      scale: EXPORT_WIDTH / width,
      outputWidth: EXPORT_WIDTH,
      outputHeight: Math.max(1, Math.round(height * (EXPORT_WIDTH / width)))
    };
  }

  function drawRoundedRectPath(ctx, x, y, width, height, radius) {
    var r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function getCanvasRectForElement(el, geometry) {
    var rect = el.getBoundingClientRect();
    return {
      x: (rect.left - geometry.left) * geometry.scale,
      y: (rect.top - geometry.top) * geometry.scale,
      width: rect.width * geometry.scale,
      height: rect.height * geometry.scale
    };
  }

  function getCanvasRadius(el, geometry, fallback) {
    var cs = getComputedStyle(el);
    var radius = parseFloat(cs.borderTopLeftRadius) || fallback || 0;
    return radius * geometry.scale;
  }

  function paintOpsConsoleCardOverlay(ctx, rect, radius, isTechCard, drawFrame, geometry) {
    var cardStep = 26 * geometry.scale / EXPORT_SCALE;
    var techStep = 22 * geometry.scale / EXPORT_SCALE;

    ctx.save();
    drawRoundedRectPath(ctx, rect.x, rect.y, rect.width, rect.height, radius);
    ctx.clip();

    var gradient = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.height);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.94)');
    gradient.addColorStop(1, 'rgba(245, 248, 255, 0.86)');
    ctx.fillStyle = gradient;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    for (var yy = rect.y; yy <= rect.y + rect.height; yy += cardStep) {
      ctx.beginPath();
      ctx.moveTo(rect.x, yy + 0.5);
      ctx.lineTo(rect.x + rect.width, yy + 0.5);
      ctx.stroke();
    }
    for (var xx = rect.x; xx <= rect.x + rect.width; xx += cardStep) {
      ctx.beginPath();
      ctx.moveTo(xx + 0.5, rect.y);
      ctx.lineTo(xx + 0.5, rect.y + rect.height);
      ctx.stroke();
    }

    if (isTechCard) {
      var gridCanvas = document.createElement('canvas');
      gridCanvas.width = Math.max(1, Math.round(rect.width));
      gridCanvas.height = Math.max(1, Math.round(rect.height));
      var gridCtx = gridCanvas.getContext('2d');
      gridCtx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      gridCtx.lineWidth = 1;

      for (var gy = 0; gy <= gridCanvas.height; gy += techStep) {
        gridCtx.beginPath();
        gridCtx.moveTo(0, gy + 0.5);
        gridCtx.lineTo(gridCanvas.width, gy + 0.5);
        gridCtx.stroke();
      }
      for (var gx = 0; gx <= gridCanvas.width; gx += techStep) {
        gridCtx.beginPath();
        gridCtx.moveTo(gx + 0.5, 0);
        gridCtx.lineTo(gx + 0.5, gridCanvas.height);
        gridCtx.stroke();
      }

      var mask = gridCtx.createLinearGradient(0, 0, 0, gridCanvas.height * 0.9);
      mask.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
      mask.addColorStop(1, 'rgba(0, 0, 0, 0)');
      gridCtx.globalCompositeOperation = 'destination-in';
      gridCtx.fillStyle = mask;
      gridCtx.fillRect(0, 0, gridCanvas.width, gridCanvas.height);

      ctx.drawImage(gridCanvas, rect.x, rect.y, rect.width, rect.height);
    }

    if (drawFrame) {
      var inset = 10 * geometry.scale / EXPORT_SCALE;
      ctx.strokeStyle = 'rgba(79, 123, 255, 0.12)';
      ctx.lineWidth = 1;
      drawRoundedRectPath(
        ctx,
        rect.x + inset,
        rect.y + inset,
        rect.width - inset * 2,
        rect.height - inset * 2,
        Math.max(0, radius - inset)
      );
      ctx.stroke();
    }

    ctx.restore();
  }

  function paintOpsConsoleChipOverlay(ctx, rect, radius) {
    ctx.save();
    drawRoundedRectPath(ctx, rect.x, rect.y, rect.width, rect.height, radius);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(79, 123, 255, 0.10)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  function applyPostRenderCorrections(canvas, geometry) {
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    editorEl.querySelectorAll(OPS_CONSOLE_CARD_SELECTORS).forEach(function (el) {
      paintOpsConsoleCardOverlay(
        ctx,
        getCanvasRectForElement(el, geometry),
        getCanvasRadius(el, geometry, 24),
        !!(el.closest && el.closest('.article-theme.style-skin-tech')),
        el.matches(OPS_CONSOLE_FRAME_SELECTORS),
        geometry
      );
    });

    editorEl.querySelectorAll(OPS_CONSOLE_CHIP_SELECTORS).forEach(function (el) {
      paintOpsConsoleChipOverlay(
        ctx,
        getCanvasRectForElement(el, geometry),
        getCanvasRadius(el, geometry, 10)
      );
    });
  }

  function copyComputedStylesToClone(sourceEl, cloneEl) {
    try {
      var cs = getComputedStyle(sourceEl);
      for (var i = 0; i < cs.length; i++) {
        var prop = cs[i];
        try {
          cloneEl.style.setProperty(prop, cs.getPropertyValue(prop), cs.getPropertyPriority(prop));
        } catch (e) {}
      }
    } catch (e) {}
  }

  function cloneNodeWithComputedStyles(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.cloneNode(false);
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return document.createTextNode('');
    }

    var clone = node.cloneNode(false);
    copyComputedStylesToClone(node, clone);

    Array.from(node.childNodes).forEach(function (child) {
      clone.appendChild(cloneNodeWithComputedStyles(child));
    });

    return clone;
  }

  async function renderToCanvasWithForeignObject(geometry) {
    await waitForAnimationFrame();
    await new Promise(function (r) { setTimeout(r, 80); });
    if (document.fonts && document.fonts.ready) await document.fonts.ready;

    var exportPrep = prepareForExport('single');
    try {
      var clone = cloneNodeWithComputedStyles(editorEl);
      clone.style.margin = '0';
      clone.style.width = geometry.width + 'px';
      clone.style.maxWidth = geometry.width + 'px';
      clone.style.minWidth = geometry.width + 'px';
      clone.querySelectorAll('[contenteditable]').forEach(function (el) {
        el.removeAttribute('contenteditable');
      });

      var wrapper = document.createElement('div');
      wrapper.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
      wrapper.style.width = geometry.width + 'px';
      wrapper.style.height = geometry.height + 'px';
      wrapper.style.margin = '0';
      wrapper.style.padding = '0';
      wrapper.style.background = getComputedStyle(document.body).background;
      wrapper.appendChild(clone);

      var serialized = new XMLSerializer().serializeToString(wrapper);
      var svgMarkup =
        '<svg xmlns="http://www.w3.org/2000/svg" width="' + geometry.width + '" height="' + geometry.height + '" viewBox="0 0 ' + geometry.width + ' ' + geometry.height + '">' +
          '<foreignObject x="0" y="0" width="100%" height="100%">' +
            serialized +
          '</foreignObject>' +
        '</svg>';
      var dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgMarkup);

      var image = await new Promise(function (resolve, reject) {
        var img = new Image();
        img.onload = function () { resolve(img); };
        img.onerror = reject;
        img.src = dataUrl;
      });

      var canvas = document.createElement('canvas');
      canvas.width = geometry.outputWidth;
      canvas.height = geometry.outputHeight;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas;
    } finally {
      exportPrep.restore();
    }
  }

  async function renderToCanvasWithHtml2Canvas(passMode, geometry) {
    await waitForAnimationFrame();
    await new Promise(function (r) { setTimeout(r, 160); });
    if (document.fonts && document.fonts.ready) await document.fonts.ready;

    var prevScroll = window.scrollY;
    window.scrollTo(0, 0);
    await waitForAnimationFrame();
    await new Promise(function (r) { setTimeout(r, 80); });
    var editorStyle = getComputedStyle(editorEl);
    var fallbackBg = getComputedStyle(document.body).backgroundColor;
    var hasEditorBackgroundImage = editorStyle.backgroundImage && editorStyle.backgroundImage !== 'none';
    var editorBackgroundAlpha = getColorAlpha(editorStyle.backgroundColor);

    var canvas = await window.html2canvas(editorEl, {
      backgroundColor: passMode === 'foreground'
        ? null
        : (hasEditorBackgroundImage || (editorBackgroundAlpha !== null && editorBackgroundAlpha > 0)
          ? null
          : ((fallbackBg && fallbackBg !== 'rgba(0, 0, 0, 0)') ? fallbackBg : '#ffffff')),
      scale: geometry.scale,
      useCORS: true,
      logging: false,
      width: geometry.width,
      height: geometry.height,
      windowWidth: geometry.width,
      windowHeight: geometry.height,
      scrollY: 0,
      scrollX: 0
    });

    window.scrollTo(0, prevScroll);
    return canvas;
  }

  async function renderCanvasPass(passMode, geometry) {
    var exportPrep = prepareForExport(passMode);
    try {
      return await renderToCanvasWithHtml2Canvas(passMode, geometry);
    } finally {
      exportPrep.restore();
    }
  }

  async function renderSinglePassCanvas(geometry) {
    return renderCanvasPass('single', geometry);
  }

  async function renderSplitPassCanvas(geometry) {
    var baseCanvas = await renderCanvasPass('base', geometry);
    var foregroundCanvas = await renderCanvasPass('foreground', geometry);
    var finalCanvas = document.createElement('canvas');
    finalCanvas.width = baseCanvas.width;
    finalCanvas.height = baseCanvas.height;

    var finalCtx = finalCanvas.getContext('2d');
    finalCtx.drawImage(baseCanvas, 0, 0);
    applyPostRenderCorrections(finalCanvas, geometry);
    finalCtx.drawImage(foregroundCanvas, 0, 0);
    return finalCanvas;
  }

  async function renderToCanvas() {
    if (typeof window.html2canvas !== 'function') {
      throw new Error('html2canvas \u672A\u52A0\u8F7D\uFF0C\u65E0\u6CD5\u5BFC\u51FA');
    }
    var geometry = getExportGeometry();
    try {
      return await renderToCanvasWithForeignObject(geometry);
    } catch (foreignObjectError) {
      console.warn('[Tianphoto] foreignObject export fallback:', foreignObjectError);
    }
    if (shouldUseSplitPassExport()) {
      return renderSplitPassCanvas(geometry);
    }
    return renderSinglePassCanvas(geometry);
  }

  function getMimeTypeForFormat(format) {
    return format === 'png' ? 'image/png' : 'image/jpeg';
  }

  function getFileExtensionForFormat(format) {
    return format === 'png' ? 'png' : 'jpg';
  }

  function canvasToDataUrlWithFormat(canvas, format) {
    if (format === 'png') return canvas.toDataURL('image/png');
    return canvas.toDataURL('image/jpeg', 0.88);
  }

  function collectSafeSliceBoundaries() {
    if (!editorEl) return [];
    var selectors = [
      '.wx-media-frame',
      '.wx-section-card',
      '.wx-intro-card',
      '.wx-summary-card',
      '.wx-quote-card',
      '.wx-timeline-item',
      '.wx-timeline-card',
      '.wx-compare-grid',
      '.wx-metric-grid',
      'table',
      'p'
    ].join(', ');
    var editorRect = editorEl.getBoundingClientRect();
    var values = [];
    editorEl.querySelectorAll(selectors).forEach(function (node) {
      var rect = node.getBoundingClientRect();
      var top = Math.round((rect.top - editorRect.top) * EXPORT_SCALE);
      var bottom = Math.round((rect.bottom - editorRect.top) * EXPORT_SCALE);
      if (top > 0) values.push(top);
      if (bottom > 0) values.push(bottom);
    });
    return values.filter(function (value, index, arr) {
      return value > 0 && arr.indexOf(value) === index;
    }).sort(function (a, b) { return a - b; });
  }

  function findSafeSliceHeight(startY, targetY, totalHeight, boundaries) {
    if (targetY >= totalHeight) return totalHeight - startY;
    var MIN_SLICE_PX = 2800;
    var lowerBound = startY + MIN_SLICE_PX;
    var candidate = null;
    boundaries.forEach(function (boundary) {
      if (boundary > lowerBound && boundary < targetY - 24) {
        candidate = boundary;
      }
    });
    if (!candidate) return targetY - startY;
    return candidate - startY;
  }

  /**
   * 将 canvas 按安全高度切片
   */
  function sliceCanvas(canvas, format) {
    var MAX_SLICE_PX = 5000;
    var totalH = canvas.height;
    var w = canvas.width;
    var mimeType = getMimeTypeForFormat(format);
    var boundaries = collectSafeSliceBoundaries();

    if (totalH <= MAX_SLICE_PX) {
      return [{
        dataUrl: canvasToDataUrlWithFormat(canvas, format),
        width: Math.round(w / EXPORT_SCALE),
        height: Math.round(totalH / EXPORT_SCALE),
        index: 1
      }];
    }

    var slices = [];
    var y = 0;
    while (y < totalH) {
      var targetY = Math.min(y + MAX_SLICE_PX, totalH);
      var h = Math.min(findSafeSliceHeight(y, targetY, totalH, boundaries), totalH - y);
      var sc = document.createElement('canvas');
      sc.width = w; sc.height = h;
      sc.getContext('2d').drawImage(canvas, 0, y, w, h, 0, 0, w, h);
      slices.push({
        dataUrl: format === 'png' ? sc.toDataURL(mimeType) : sc.toDataURL(mimeType, 0.88),
        width: Math.round(w / EXPORT_SCALE),
        height: Math.round(h / EXPORT_SCALE),
        index: slices.length + 1
      });
      y += h;
    }
    return slices;
  }

  /* ═══ 导出主流程 ═══ */

  async function exportPage() {
    if (isExporting) return;
    isExporting = true;

    // 不要在渲染前打开弹窗！先渲染，再展示结果。
    // v5.0 的 bug 之一就是弹窗的 display 状态和 prepareForExport 冲突。
    showToast('\u6B63\u5728\u51C6\u5907\u5BFC\u51FA...');
    try {
      // 渲染
      var canvas = await renderToCanvas();
      var safeBaseName = (document.title || 'article').replace(/[^\w\u4e00-\u9fff-]/g, '_');
      ['jpg', 'png'].forEach(function (format) {
        var ext = getFileExtensionForFormat(format);
        var slices = sliceCanvas(canvas, format);
        slices.forEach(function (slice, i) {
          slice.filename = '\u5207\u7247-' + (i + 1) + '.' + ext;
        });
        exportArtifacts[format] = {
          slices: slices,
          full: {
            dataUrl: canvasToDataUrlWithFormat(canvas, format),
            width: Math.round(canvas.width / EXPORT_SCALE),
            height: Math.round(canvas.height / EXPORT_SCALE),
            filename: safeBaseName + '.' + ext
          }
        };
      });
      exportSlices = exportArtifacts[currentExportFormat].slices;
      exportFullImage = exportArtifacts[currentExportFormat].full;

      // 渲染成功，弹出预览弹窗
      showExportModal();
      renderGallery();
      showToast('\u5BFC\u51FA\u5B8C\u6210');

    } catch (err) {
      console.error('[Tianphoto] Export error:', err);
      var message = err && err.message ? err.message : String(err);
      showToast('\u5BFC\u51FA\u5931\u8D25\uFF1A' + message, 5000);
    } finally {
      isExporting = false;
    }
  }

  /* ═══ 预览渲染 ═══ */

  function getCurrentPreviewItems() {
    var artifacts = exportArtifacts[currentExportFormat] || { slices: [], full: null };
    if (currentExportMode === 'full') {
      return artifacts.full ? [artifacts.full] : [];
    }
    return artifacts.slices || [];
  }

  function getPreviewInfo(activeItem, itemCount) {
    var formatLabel = currentExportFormat === 'png' ? 'PNG' : 'JPG';
    if (currentExportMode === 'full') {
      return '\u5355\u5F20\u5B8C\u6574' + formatLabel + ' \u00B7 ' + activeItem.width + 'x' + activeItem.height + 'px' + (currentPreviewScaleMode === 'actual' ? ' \u00B7 \u53EF\u62D6\u52A8\u67E5\u770B' : '');
    }
    return '\u5F53\u524D' + formatLabel + '\u9884\u89C8 ' + (currentPreviewIndex + 1) + '/' + itemCount + ' \u00B7 ' + activeItem.width + 'x' + activeItem.height + 'px' + (currentPreviewScaleMode === 'actual' ? ' \u00B7 \u53EF\u62D6\u52A8\u67E5\u770B' : '');
  }

  function createPreviewThumb(item, index, itemCount) {
    var button = document.createElement('button');
    button.className = 'export-thumb' + (index === currentPreviewIndex ? ' is-active' : '');
    button.type = 'button';
    button.innerHTML =
      '<img src="' + item.dataUrl + '" alt="' + item.filename + '">' +
      '<span>' + (currentExportMode === 'full' ? '\u5B8C\u6574\u56FE' : '\u5207\u7247 ' + (index + 1)) + '</span>';
    button.addEventListener('click', function () {
      currentPreviewIndex = index;
      renderGallery();
    });
    if (itemCount === 1) button.classList.add('is-single');
    return button;
  }

  function attachPreviewPanHandlers(previewCanvas) {
    if (!previewCanvas || currentPreviewScaleMode !== 'actual') return;

    var img = previewCanvas.querySelector('img');
    if (img) img.setAttribute('draggable', 'false');

    var panState = null;

    previewCanvas.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      if (previewCanvas.scrollWidth <= previewCanvas.clientWidth && previewCanvas.scrollHeight <= previewCanvas.clientHeight) {
        return;
      }
      panState = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        scrollLeft: previewCanvas.scrollLeft,
        scrollTop: previewCanvas.scrollTop
      };
      previewCanvas.classList.add('is-dragging');
      if (previewCanvas.setPointerCapture) {
        try { previewCanvas.setPointerCapture(e.pointerId); } catch (err) {}
      }
      e.preventDefault();
    });

    previewCanvas.addEventListener('pointermove', function (e) {
      if (!panState || e.pointerId !== panState.pointerId) return;
      previewCanvas.scrollLeft = panState.scrollLeft - (e.clientX - panState.startX);
      previewCanvas.scrollTop = panState.scrollTop - (e.clientY - panState.startY);
      e.preventDefault();
    });

    function stopPan(e) {
      if (!panState) return;
      if (e && e.pointerId !== undefined && e.pointerId !== panState.pointerId) return;
      if (previewCanvas.releasePointerCapture && panState.pointerId !== undefined) {
        try { previewCanvas.releasePointerCapture(panState.pointerId); } catch (err) {}
      }
      panState = null;
      previewCanvas.classList.remove('is-dragging');
    }

    previewCanvas.addEventListener('pointerup', stopPan);
    previewCanvas.addEventListener('pointercancel', stopPan);
    previewCanvas.addEventListener('lostpointercapture', stopPan);
  }

  function renderGallery() {
    var gallery = dialog.querySelector('.export-gallery');
    var stage = dialog.querySelector('.export-preview-stage');
    var strip = dialog.querySelector('.export-thumb-strip');
    var info = dialog.querySelector('.export-info');
    var dlBtn = dialog.querySelector('.export-btn-download');
    var items = getCurrentPreviewItems();

    gallery.classList.toggle('is-full-mode', currentExportMode === 'full');
    stage.innerHTML = '';
    strip.innerHTML = '';
    strip.hidden = true;
    dlBtn.disabled = items.length === 0;

    if (items.length === 0) {
      info.textContent = '\u6682\u65E0\u53EF\u9884\u89C8\u7684\u5BFC\u51FA\u56FE\u7247';
      dlBtn.textContent = '\u4E0B\u8F7D\u5168\u90E8';
      return;
    }

    if (currentPreviewIndex >= items.length) currentPreviewIndex = 0;
    var activeItem = items[currentPreviewIndex];
    var previewCanvas = document.createElement('div');
    previewCanvas.className = 'export-preview-canvas' + (currentPreviewScaleMode === 'actual' ? ' is-actual' : ' is-fit');
    previewCanvas.innerHTML = '<img src="' + activeItem.dataUrl + '" alt="' + activeItem.filename + '">';
    attachPreviewPanHandlers(previewCanvas);
    stage.appendChild(previewCanvas);

    if (items.length > 1) {
      strip.hidden = false;
      items.forEach(function (item, index) {
        strip.appendChild(createPreviewThumb(item, index, items.length));
      });
    }

    info.textContent = getPreviewInfo(activeItem, items.length);
    dlBtn.textContent = currentExportMode === 'full'
      ? '\u4E0B\u8F7D\u56FE\u7247'
      : '\u4E0B\u8F7D\u5168\u90E8 (' + items.length + ')';
  }

  /* ═══ 下载 ═══ */

  function triggerDownload(dataUrl, filename) {
    var link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  }

  function downloadSlice(slice) {
    triggerDownload(slice.dataUrl, slice.filename);
    showToast('\u5DF2\u4E0B\u8F7D: ' + slice.filename);
  }

  function downloadFullImage() {
    var fullImage = exportArtifacts[currentExportFormat] && exportArtifacts[currentExportFormat].full;
    if (!fullImage) return;
    triggerDownload(fullImage.dataUrl, fullImage.filename);
    showToast('\u5DF2\u4E0B\u8F7D\u5B8C\u6574' + (currentExportFormat === 'png' ? ' PNG' : ' JPG') + '\u56FE\u7247');
  }

  function downloadAllSlices() {
    var slices = exportArtifacts[currentExportFormat] ? exportArtifacts[currentExportFormat].slices : [];
    slices.forEach(function (slice, idx) {
      setTimeout(function () { triggerDownload(slice.dataUrl, slice.filename); }, idx * 200);
    });
    showToast('\u5F00\u59CB\u4E0B\u8F7D ' + slices.length + ' \u5F20' + (currentExportFormat === 'png' ? ' PNG' : ' JPG') + '\u56FE\u7247...');
  }
