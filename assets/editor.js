/**
 * editor.js — Tianphoto 轻量内置编辑器
 * 自包含 IIFE，零外部依赖（html2canvas 通过 window.html2canvas 引用）
 * 功能：文字编辑、图片插入、格式工具栏、PNG 导出切片、HTML 保存
 */
(function () {
  'use strict';

  // 卡片级切片选择器（按语义边界切片）
  var CARD_SELECTORS = [
    '.phone-brand-banner',
    '.wx-hero-card',
    '.wx-intro-card',
    '.wx-section-card',
    '.wx-metric-grid',
    '.wx-compare-grid',
    '.wx-timeline-card',
    '.wx-quote-card',
    '.wx-summary-card',
    '.wx-divider-ornament',
    '.wx-inline-graphic',
    '.wx-badge-art',
    '.wx-image-drop-zone',
    'table'
  ];

  var savedRange = null;
  var exportSlices = [];
  var isExporting = false;

  var editorEl = null;
  var toolbar = null;
  var overlay = null;
  var dialog = null;
  var toast = null;

  // ─── 选区管理 ───

  function captureSelection() {
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    var range = sel.getRangeAt(0);
    if (!editorEl.contains(range.commonAncestorContainer)) return;
    savedRange = range.cloneRange();
  }

  function restoreSelection() {
    if (!savedRange) return false;
    if (!editorEl.contains(savedRange.commonAncestorContainer)) return false;
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRange);
    return true;
  }

  // ─── 提示 ───

  function showToast(msg, duration) {
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'editor-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('is-visible');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () {
      toast.classList.remove('is-visible');
    }, duration || 2000);
  }

  // ─── 图片插入 ───

  function fileToDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function buildImageBlock(dataUrl) {
    return '<figure class="wx-media-frame">' +
      '<img src="' + dataUrl + '" alt="\u63D2\u56FE" class="polished-image" />' +
      '</figure>';
  }

  function insertHtmlAtCursor(html) {
    restoreSelection();
    editorEl.focus();
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      editorEl.insertAdjacentHTML('beforeend', html);
      return;
    }
    var range = sel.getRangeAt(0);
    range.deleteContents();
    var tpl = document.createElement('template');
    tpl.innerHTML = html.trim();
    var frag = tpl.content;
    var lastNode = frag.lastChild;
    range.insertNode(frag);
    if (lastNode) {
      range.setStartAfter(lastNode);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    captureSelection();
  }

  async function handleImageFiles(files) {
    for (var i = 0; i < files.length; i++) {
      if (!files[i].type.startsWith('image/')) continue;
      var dataUrl = await fileToDataUrl(files[i]);
      insertHtmlAtCursor(buildImageBlock(dataUrl));
    }
  }

  // ─── 保存 HTML ───

  function saveHtml() {
    var clone = document.documentElement.cloneNode(true);

    var uiEls = clone.querySelectorAll('.editor-toolbar, .export-overlay, .editor-toast');
    for (var i = 0; i < uiEls.length; i++) uiEls[i].parentNode.removeChild(uiEls[i]);

    var container = clone.querySelector('.article-container');
    if (container) container.removeAttribute('contenteditable');

    var editables = clone.querySelectorAll('.article-container [contenteditable]');
    for (var j = 0; j < editables.length; j++) editables[j].removeAttribute('contenteditable');

    var html = '<!DOCTYPE html>\n' + clone.outerHTML;
    var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    var url = URL.createObjectURL(blob);

    var filename = document.title || 'article';
    filename = filename.replace(/[^\w\u4e00-\u9fff-]/g, '_') + '.html';

    var link = document.createElement('a');
    link.download = filename;
    link.href = url;
    link.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 5000);

    showToast('\u2705 \u6587\u4EF6\u5DF2\u4FDD\u5B58');
  }

  // ─── 导出流水线 ───

  /**
   * 将 :root 上的 CSS 变量解析为计算后的实际颜色值，
   * 写入 export surface 的 inline style。
   * 这样 html2canvas 在渲染时看到的全是 rgb()/rgba() 等标准值，
   * 不会因为不支持 color-mix() 等新函数而报错。
   */
  function resolveVarsToInline(surface) {
    var computed = getComputedStyle(document.documentElement);
    var varNames = [
      '--accent', '--accent-strong', '--accent-soft',
      '--surface', '--surface-strong', '--phone-bg',
      '--text-main', '--text-muted', '--paper',
      '--card-radius', '--icon-radius',
      '--card-border', '--card-shadow', '--hero-shadow',
      '--heading-font', '--body-font',
      '--hero-grad-a', '--hero-grad-b', '--hero-fade',
      '--brand-plate', '--brand-shadow', '--brand-text', '--brand-subtle',
      '--brand-chip-bg', '--brand-chip-fg',
      '--mesh-opacity', '--eyebrow-spacing'
    ];
    var styles = [];
    for (var i = 0; i < varNames.length; i++) {
      var val = computed.getPropertyValue(varNames[i]).trim();
      if (val) styles.push(varNames[i] + ':' + val);
    }
    // 将解析后的变量值作为 inline style 写入 surface
    surface.style.cssText += ';' + styles.join(';');
  }

  async function renderCanvas(element) {
    if (typeof window.html2canvas !== 'function') {
      throw new Error('html2canvas \u672A\u52A0\u8F7D\uFF0C\u65E0\u6CD5\u5BFC\u51FA');
    }
    return window.html2canvas(element, {
      backgroundColor: null,
      height: element.scrollHeight,
      logging: false,
      scale: 2,
      useCORS: true,
      width: element.scrollWidth,
      windowHeight: element.scrollHeight,
      windowWidth: element.scrollWidth,
    });
  }

  /**
   * 按卡片边界计算切片区间。
   * 返回 [{y, height}]，每个切片包含一或多个相邻卡片。
   * 单张切片最大高度限制为 MAX_SLICE_PX（防止超长卡片），超过则回退到固定高度切。
   */
  function computeCardSlices(surface, scale) {
    var MAX_SLICE_PX = 3200 * scale; // 安全上限
    var selectorAll = CARD_SELECTORS.join(',');
    // 先查 .wx-article-shell 内的顶级卡片
    var shell = surface.querySelector('.wx-article-shell');
    var cards = shell
      ? shell.querySelectorAll(':scope > ' + CARD_SELECTORS.map(function(s){ return s; }).join(', :scope > '))
      : surface.querySelectorAll(selectorAll);

    if (!cards || cards.length === 0) {
      // 无卡片，整张输出
      return [{ y: 0, height: surface.scrollHeight * scale }];
    }

    var surfaceRect = surface.getBoundingClientRect();
    var slices = [];
    var currentY = 0;

    for (var i = 0; i < cards.length; i++) {
      var rect = cards[i].getBoundingClientRect();
      var cardTop = Math.round((rect.top - surfaceRect.top) * scale);
      var cardBottom = Math.round((rect.bottom - surfaceRect.top) * scale);

      // 如果当前切片为空或者加上这张卡片不超限，合并
      if (slices.length === 0) {
        slices.push({ y: 0, height: cardBottom });
      } else {
        var last = slices[slices.length - 1];
        if (cardBottom - last.y <= MAX_SLICE_PX) {
          // 合并到当前切片
          last.height = cardBottom - last.y;
        } else {
          // 开新切片
          slices.push({ y: last.y + last.height, height: cardBottom - (last.y + last.height) });
        }
      }
    }

    // 确保覆盖到页面底部（含 padding）
    var totalH = surface.scrollHeight * scale;
    if (slices.length > 0) {
      var lastSlice = slices[slices.length - 1];
      var bottom = lastSlice.y + lastSlice.height;
      if (bottom < totalH) {
        lastSlice.height = totalH - lastSlice.y;
      }
    }

    return slices;
  }

  function sliceCanvasByRegions(canvas, regions) {
    var slices = [];
    for (var i = 0; i < regions.length; i++) {
      var r = regions[i];
      var h = Math.min(r.height, canvas.height - r.y);
      if (h <= 0) continue;
      var pageCanvas = document.createElement('canvas');
      var ctx = pageCanvas.getContext('2d');
      pageCanvas.width = canvas.width;
      pageCanvas.height = h;
      ctx.drawImage(canvas, 0, r.y, canvas.width, h, 0, 0, canvas.width, h);
      slices.push({
        dataUrl: pageCanvas.toDataURL('image/png', 1),
        filename: '\u5207\u7247-' + (i + 1) + '.png',
        width: Math.round(canvas.width / 2),
        height: Math.round(h / 2),
      });
    }
    return slices;
  }

  /**
   * 遍历 export surface 中所有 SVG 及其子元素，
   * 将属性值中的 var(--xxx) 替换为 :root 上计算后的实际值。
   * html2canvas 无法解析 SVG 属性中的 CSS 变量，必须内联。
   * 同时处理 inline style 中的 var() 以及 html2canvas 不支持的 CSS 特性。
   */
  function resolveSvgVars(surface) {
    var computed = getComputedStyle(document.documentElement);
    var varRegex = /var\(\s*(--[^,)]+?)(?:\s*,\s*([^)]*))?\s*\)/g;

    function resolveVar(m, name, fallback) {
      var resolved = computed.getPropertyValue(name).trim();
      return resolved || fallback || m;
    }

    // 1) SVG 属性中的 var()
    var svgEls = surface.querySelectorAll('svg, svg *');
    for (var i = 0; i < svgEls.length; i++) {
      var el = svgEls[i];
      var attrs = el.attributes;
      for (var j = 0; j < attrs.length; j++) {
        var val = attrs[j].value;
        if (val && val.indexOf('var(') !== -1) {
          attrs[j].value = val.replace(varRegex, resolveVar);
        }
      }
    }

    // 2) inline style 中的 var()
    var allEls = surface.querySelectorAll('[style]');
    for (var k = 0; k < allEls.length; k++) {
      var style = allEls[k].getAttribute('style');
      if (style && style.indexOf('var(') !== -1) {
        allEls[k].setAttribute('style', style.replace(varRegex, resolveVar));
      }
    }

    // 3) 处理 -webkit-background-clip:text（渐变文字）
    //    html2canvas 不支持此特性，会导致文字透明。
    //    将其改为使用 accent-strong 颜色。
    var clipEls = surface.querySelectorAll('*');
    for (var n = 0; n < clipEls.length; n++) {
      var cs = getComputedStyle(clipEls[n]);
      // Safari/Chrome 使用 -webkit-background-clip
      var bgClip = cs.webkitBackgroundClip || cs.backgroundClip;
      if (bgClip === 'text') {
        var accentColor = computed.getPropertyValue('--accent-strong').trim() || '#333';
        clipEls[n].style.background = 'none';
        clipEls[n].style.webkitBackgroundClip = 'border-box';
        clipEls[n].style.backgroundClip = 'border-box';
        clipEls[n].style.webkitTextFillColor = 'initial';
        clipEls[n].style.color = accentColor;
      }
    }
  }

  // ─── 封面生成（公众号 2.35:1 宽封面 + 右上角裁切 1:1 小图） ───

  var COVER_W = 1080;

  function getCoverPalette() {
    var cs = getComputedStyle(document.documentElement);
    return {
      accent:   cs.getPropertyValue('--accent').trim()        || '#5d72ff',
      strong:   cs.getPropertyValue('--accent-strong').trim()  || '#2f43c8',
      heroA:    cs.getPropertyValue('--hero-grad-a').trim()    || '#5d72ff',
      heroB:    cs.getPropertyValue('--hero-grad-b').trim()    || '#2f43c8',
      headFont: cs.getPropertyValue('--heading-font').trim()   || '"PingFang SC",system-ui,sans-serif',
      bodyFont: cs.getPropertyValue('--body-font').trim()      || '"PingFang SC",system-ui,sans-serif',
    };
  }

  function hashStr(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i) | 0;
    return Math.abs(h);
  }

  function extractTitle(hero, maxLen) {
    var h1 = hero.querySelector('h1');
    if (!h1) return '';
    var raw = h1.innerText.replace(/[\s\u00A0]+/g, ' ').trim();
    var line = raw.split(/\n/)[0].trim();
    if (line.length <= maxLen) return line;
    var best = line.slice(0, maxLen);
    var puncts = /[，。、！？·\-—：:\s]/g;
    var m, lastCut = 0;
    while ((m = puncts.exec(line)) !== null) {
      if (m.index > 0 && m.index <= maxLen) lastCut = m.index;
    }
    return lastCut > maxLen * 0.4 ? line.slice(0, lastCut) : best;
  }

  /**
   * 封面背景 SVG。
   * 右上角 badge 区域有精致的装饰框和同心圆。
   */
  function buildCoverBgSvg(w, h, pal, seed) {
    // badge 中心：右上角
    var bx = w - 128, by = 128;
    var s = seed;
    function rng() { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }

    var o = [];
    o.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'">');

    // defs
    o.push('<defs>');
    o.push('<linearGradient id="cvBg" x1="0" y1="0" x2="1" y2="1">');
    o.push('<stop offset="0%" stop-color="#0f0c29"/>');
    o.push('<stop offset="35%" stop-color="#1a1a3e"/>');
    o.push('<stop offset="70%" stop-color="'+pal.strong+'" stop-opacity="0.4"/>');
    o.push('<stop offset="100%" stop-color="#0d1117"/>');
    o.push('</linearGradient>');
    o.push('<radialGradient id="cvG1" cx="0.25" cy="0.55" r="0.6">');
    o.push('<stop offset="0%" stop-color="'+pal.accent+'" stop-opacity="0.18"/>');
    o.push('<stop offset="100%" stop-color="'+pal.accent+'" stop-opacity="0"/>');
    o.push('</radialGradient>');
    o.push('<radialGradient id="cvG2" cx="'+(bx/w).toFixed(2)+'" cy="'+(by/h).toFixed(2)+'" r="0.4">');
    o.push('<stop offset="0%" stop-color="'+pal.heroA+'" stop-opacity="0.2"/>');
    o.push('<stop offset="100%" stop-color="'+pal.heroA+'" stop-opacity="0"/>');
    o.push('</radialGradient>');
    o.push('<radialGradient id="cvG3" cx="0.7" cy="0.8" r="0.5">');
    o.push('<stop offset="0%" stop-color="'+pal.heroB+'" stop-opacity="0.12"/>');
    o.push('<stop offset="100%" stop-color="'+pal.heroB+'" stop-opacity="0"/>');
    o.push('</radialGradient>');
    o.push('</defs>');

    // 底色 + 光晕
    o.push('<rect width="'+w+'" height="'+h+'" fill="url(#cvBg)"/>');
    o.push('<rect width="'+w+'" height="'+h+'" fill="url(#cvG1)"/>');
    o.push('<rect width="'+w+'" height="'+h+'" fill="url(#cvG2)"/>');
    o.push('<rect width="'+w+'" height="'+h+'" fill="url(#cvG3)"/>');

    // 对角线
    o.push('<g stroke="rgba(255,255,255,0.04)" stroke-width="1" fill="none">');
    for (var li = 0; li < 3; li++) {
      o.push('<line x1="'+Math.round(rng()*w*0.3)+'" y1="'+Math.round(rng()*h)+'" x2="'+Math.round(w*0.6+rng()*w*0.4)+'" y2="'+Math.round(rng()*h)+'"/>');
    }
    o.push('</g>');

    // 左下角 L 型角标
    var lm = 44, ll = 28;
    o.push('<g stroke="'+pal.accent+'" stroke-width="1.5" opacity="0.25" stroke-linecap="round">');
    o.push('<line x1="'+lm+'" y1="'+(h-lm)+'" x2="'+lm+'" y2="'+(h-lm-ll)+'"/>');
    o.push('<line x1="'+lm+'" y1="'+(h-lm)+'" x2="'+(lm+ll)+'" y2="'+(h-lm)+'"/>');
    o.push('</g>');

    // 右上角 badge 装饰
    // 同心圆
    o.push('<circle cx="'+bx+'" cy="'+by+'" r="88" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>');
    o.push('<circle cx="'+bx+'" cy="'+by+'" r="68" fill="none" stroke="'+pal.accent+'" stroke-opacity="0.12" stroke-width="1"/>');
    o.push('<circle cx="'+bx+'" cy="'+by+'" r="48" fill="none" stroke="'+pal.accent+'" stroke-opacity="0.08" stroke-width="1" stroke-dasharray="4 6"/>');

    // badge 角标 (小 L 型，围绕 ~150×150 区域)
    var bs = 78, bm = 3;
    var bx0 = bx-bs, by0 = by-bs, bx1 = bx+bs, by1 = by+bs;
    var bl = 18;
    o.push('<g stroke="'+pal.accent+'" stroke-width="1" opacity="0.25" stroke-linecap="round">');
    o.push('<line x1="'+bx0+'" y1="'+by0+'" x2="'+bx0+'" y2="'+(by0+bl)+'"/>');
    o.push('<line x1="'+bx0+'" y1="'+by0+'" x2="'+(bx0+bl)+'" y2="'+by0+'"/>');
    o.push('<line x1="'+bx1+'" y1="'+by0+'" x2="'+bx1+'" y2="'+(by0+bl)+'"/>');
    o.push('<line x1="'+bx1+'" y1="'+by0+'" x2="'+(bx1-bl)+'" y2="'+by0+'"/>');
    o.push('<line x1="'+bx1+'" y1="'+by1+'" x2="'+bx1+'" y2="'+(by1-bl)+'"/>');
    o.push('<line x1="'+bx1+'" y1="'+by1+'" x2="'+(bx1-bl)+'" y2="'+by1+'"/>');
    o.push('<line x1="'+bx0+'" y1="'+by1+'" x2="'+bx0+'" y2="'+(by1-bl)+'"/>');
    o.push('<line x1="'+bx0+'" y1="'+by1+'" x2="'+(bx0+bl)+'" y2="'+by1+'"/>');
    o.push('</g>');

    // 光粒子
    o.push('<g>');
    for (var di = 0; di < 20; di++) {
      var px = Math.round(rng() * w), py = Math.round(rng() * h);
      var pr = (1 + rng() * 2).toFixed(1);
      var po = (0.1 + rng() * 0.35).toFixed(2);
      o.push('<circle cx="'+px+'" cy="'+py+'" r="'+pr+'" fill="rgba(255,255,255,'+po+')"/>');
    }
    o.push('</g>');

    // 底部细线
    o.push('<line x1="52" y1="'+(h-16)+'" x2="'+(w-52)+'" y2="'+(h-16)+'" stroke="rgba(255,255,255,0.04)" stroke-width="0.5"/>');

    o.push('</svg>');
    return o.join('');
  }

  function extractIconSvg(surface) {
    var el = surface.querySelector('.wx-section-icon svg');
    if (!el) return null;
    var c = el.cloneNode(true);
    c.setAttribute('width', '44');
    c.setAttribute('height', '44');
    c.style.cssText = 'display:block;color:rgba(255,255,255,0.82);';
    return c;
  }

  /**
   * 2.35:1 宽封面 (1080×460)
   *
   * ┌───────────────────────────────────────────────────┐
   * │ [Logo]                         ┌─ badge ─┐       │
   * │                                │ icon    │       │
   * │ 大标题关键词                    │ 2字     │       │
   * │ ── accent                      └─────────┘       │
   * │ 副标题                                           │
   * └───────────────────────────────────────────────────┘
   *
   * badge 在右上角，~150px 见方，裁切时居于 1:1 中心。
   */
  function buildCoverWide(hero, palette, surface) {
    var w = COVER_W;
    var h = Math.round(w / 2.35);
    var badgeCx = w - 128;
    var badgeCy = 128;

    var div = document.createElement('div');
    div.className = 'cover-surface';
    div.style.cssText = 'width:'+w+'px;height:'+h+'px;';
    resolveVarsToInline(div);

    // 背景 SVG
    var titleFull = extractTitle(hero, 10);
    var bgWrap = document.createElement('div');
    bgWrap.className = 'cover-bg-svg';
    bgWrap.innerHTML = buildCoverBgSvg(w, h, palette, hashStr(titleFull));
    div.appendChild(bgWrap);

    // ── Logo (左上角) ──
    var logoImg = surface.querySelector('.phone-brand-mark img');
    var hasLogo = false;
    if (logoImg && logoImg.src) {
      hasLogo = true;
      var logoWrap = document.createElement('div');
      logoWrap.style.cssText = 'position:absolute;left:52px;top:36px;width:46px;height:46px;border-radius:13px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.08);display:grid;place-items:center;z-index:2;overflow:hidden;';
      var lc = logoImg.cloneNode(true);
      lc.style.cssText = 'width:78%;height:78%;object-fit:contain;display:block;';
      logoWrap.appendChild(lc);
      div.appendChild(logoWrap);
    }

    // ── 文字区 (左侧主体) ──
    var textTop = hasLogo ? 92 : 0;
    var textRight = 300; // 给 badge 留空间
    var left = document.createElement('div');
    left.style.cssText = 'position:absolute;left:52px;top:'+textTop+'px;right:'+textRight+'px;height:'+(h-textTop)+'px;display:flex;flex-direction:column;justify-content:center;z-index:2;';

    // 眉标
    var eyebrow = hero.querySelector('.wx-eyebrow');
    if (eyebrow && !hasLogo) {
      var tag = document.createElement('div');
      tag.className = 'cover-tag';
      tag.style.cssText = 'font-size:12px;margin-bottom:16px;align-self:flex-start;font-family:'+palette.bodyFont+',system-ui;';
      tag.textContent = eyebrow.textContent.trim();
      left.appendChild(tag);
    }

    // 大标题
    if (titleFull) {
      var kw = document.createElement('div');
      kw.className = 'cover-kw';
      var fs = titleFull.length <= 4 ? 78 : titleFull.length <= 6 ? 66 : titleFull.length <= 8 ? 56 : 48;
      kw.style.cssText = 'font-size:'+fs+'px;font-family:'+palette.headFont+',system-ui;text-align:left;line-height:1.15;';
      kw.textContent = titleFull;
      left.appendChild(kw);
    }

    // accent bar
    var bar = document.createElement('div');
    bar.style.cssText = 'width:44px;height:3px;border-radius:2px;background:'+palette.accent+';opacity:0.55;margin:14px 0;';
    left.appendChild(bar);

    // 副标题
    var lead = hero.querySelector('.wx-lead');
    if (lead) {
      var sub = document.createElement('div');
      sub.className = 'cover-sub';
      var subText = lead.textContent.trim();
      if (subText.length > 28) subText = subText.slice(0, 28) + '…';
      sub.style.cssText = 'font-size:18px;text-align:left;font-family:'+palette.bodyFont+',system-ui;';
      sub.textContent = subText;
      left.appendChild(sub);
    }
    div.appendChild(left);

    // ── Badge (右上角，小巧) ──
    var badge = document.createElement('div');
    badge.style.cssText = 'position:absolute;z-index:2;display:flex;flex-direction:column;align-items:center;justify-content:center;' +
      'left:'+(badgeCx-75)+'px;top:'+(badgeCy-75)+'px;width:150px;height:150px;';

    var icon = extractIconSvg(surface);
    if (icon) {
      icon.style.marginBottom = '8px';
      badge.appendChild(icon);
    }

    var shortKw = extractTitle(hero, 3);
    if (shortKw) {
      var kwEl = document.createElement('div');
      kwEl.className = 'cover-kw';
      kwEl.style.cssText = 'font-size:28px;font-family:'+palette.headFont+',system-ui;line-height:1.2;';
      kwEl.textContent = shortKw;
      badge.appendChild(kwEl);
    }
    div.appendChild(badge);

    return div;
  }

  /**
   * 只渲染一次宽封面。
   * 1:1 小图 = 从右上角裁切正方形（badge 居中）。
   */
  async function generateCovers(surface, containerWidth) {
    var covers = [];
    var hero = surface.querySelector('.wx-hero-card');
    if (!hero) return covers;

    var palette = getCoverPalette();
    var coverDiv = buildCoverWide(hero, palette, surface);
    document.body.appendChild(coverDiv);
    resolveSvgVars(coverDiv);

    try {
      await new Promise(function (r) { requestAnimationFrame(r); });
      var canvas = await renderCanvas(coverDiv);
      var scale = 2;
      var h = Math.round(COVER_W / 2.35);

      // 1) 完整 2.35:1 宽封面
      covers.push({
        dataUrl: canvas.toDataURL('image/png', 1),
        filename: '\u5C01\u9762-2.35x1.png',
        width: Math.round(canvas.width / scale),
        height: Math.round(canvas.height / scale),
        type: 'cover',
        label: '\u5934\u6761\u5C01\u9762',
      });

      // 2) 右上角 1:1 裁切（以 badge 为中心取正方形）
      var badgeCx = (COVER_W - 128) * scale;
      var badgeCy = 128 * scale;
      var cropSize = Math.round(h * 0.62 * scale); // ~285px 见方 * scale
      var cropX = Math.max(0, Math.min(badgeCx - cropSize / 2, canvas.width - cropSize));
      var cropY = Math.max(0, Math.min(badgeCy - cropSize / 2, canvas.height - cropSize));

      var sqCanvas = document.createElement('canvas');
      sqCanvas.width = cropSize;
      sqCanvas.height = cropSize;
      var sqCtx = sqCanvas.getContext('2d');
      sqCtx.drawImage(canvas, cropX, cropY, cropSize, cropSize, 0, 0, cropSize, cropSize);

      covers.push({
        dataUrl: sqCanvas.toDataURL('image/png', 1),
        filename: '\u5C01\u9762-1x1.png',
        width: Math.round(cropSize / scale),
        height: Math.round(cropSize / scale),
        type: 'cover',
        label: '\u5C0F\u56FE\u5C01\u9762',
      });
    } finally {
      document.body.removeChild(coverDiv);
    }

    return covers;
  }

  async function exportPage() {
    if (isExporting) return;
    isExporting = true;
    showToast('\u6B63\u5728\u751F\u6210\u5207\u56FE\uFF0C\u8BF7\u7A0D\u5019\u2026', 15000);

    // 获取编辑区实际渲染宽度（所见即所得）
    var containerWidth = editorEl.offsetWidth;

    var surface = document.createElement('div');
    surface.className = 'export-surface';
    surface.style.cssText = 'position:absolute;left:-9999px;top:0;width:' + containerWidth + 'px;';

    // 将 CSS 变量解析为计算值，避免 html2canvas 不支持 color-mix 等新 CSS 函数
    resolveVarsToInline(surface);

    surface.innerHTML = editorEl.innerHTML;

    surface.removeAttribute('contenteditable');
    var editables = surface.querySelectorAll('[contenteditable]');
    for (var i = 0; i < editables.length; i++) editables[i].removeAttribute('contenteditable');

    var uiEls = surface.querySelectorAll('.editor-toolbar, .export-overlay, .editor-toast');
    for (var j = 0; j < uiEls.length; j++) uiEls[j].parentNode.removeChild(uiEls[j]);

    document.body.appendChild(surface);

    // 将 SVG 属性、inline style 中的 var() 替换为计算后的值
    // 必须在 appendChild 之后执行，否则 getComputedStyle 无法工作
    resolveSvgVars(surface);

    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      await waitForImages(surface);
      await new Promise(function (r) { requestAnimationFrame(r); });
      await new Promise(function (r) { setTimeout(r, 200); });

      var scale = 2;
      var regions = computeCardSlices(surface, scale);

      var canvas = await renderCanvas(surface);
      exportSlices = sliceCanvasByRegions(canvas, regions);

      // 生成封面图（排在切片之前）
      var covers = await generateCovers(surface, containerWidth);
      exportSlices = covers.concat(exportSlices);

      showExportModal(exportSlices);
      showToast('\u5207\u56FE\u5B8C\u6210\uFF0C\u5171 ' + exportSlices.length + ' \u5F20');
    } catch (err) {
      showToast('\u5BFC\u51FA\u5931\u8D25\uFF1A' + (err.message || err), 4000);
    } finally {
      document.body.removeChild(surface);
      isExporting = false;
    }
  }

  function waitForImages(container) {
    var imgs = container.querySelectorAll('img');
    var promises = [];
    for (var i = 0; i < imgs.length; i++) {
      (function (img) {
        if (img.complete) return;
        promises.push(new Promise(function (resolve) {
          img.onload = resolve;
          img.onerror = resolve;
        }));
      })(imgs[i]);
    }
    return Promise.all(promises);
  }

  // ─── 导出弹窗 ───

  function showExportModal(slices) {
    var gallery = dialog.querySelector('.export-gallery');
    gallery.innerHTML = '';

    for (var i = 0; i < slices.length; i++) {
      (function (slice, idx) {
        var card = document.createElement('div');
        card.className = 'export-slice-card';

        var img = document.createElement('img');
        img.src = slice.dataUrl;
        img.alt = slice.filename;
        img.title = '\u70B9\u51FB\u4E0B\u8F7D\u7B2C ' + (idx + 1) + ' \u5F20';
        img.addEventListener('click', function () {
          downloadDataUrl(slice.dataUrl, slice.filename);
        });

        var info = document.createElement('div');
        info.className = 'export-slice-info';
        var infoText = slice.width + ' \u00D7 ' + slice.height + 'px \u00B7 ' + slice.filename;
        if (slice.type === 'cover' && slice.label) {
          infoText = '\u300C' + slice.label + '\u300D ' + infoText;
        }
        info.textContent = infoText;

        card.appendChild(img);
        card.appendChild(info);
        gallery.appendChild(card);
      })(slices[i], i);
    }

    var countEl = dialog.querySelector('.export-count');
    if (countEl) countEl.textContent = '\u5171 ' + slices.length + ' \u5F20\u5207\u7247';

    overlay.classList.add('is-visible');
  }

  function hideExportModal() {
    overlay.classList.remove('is-visible');
  }

  function downloadDataUrl(dataUrl, filename) {
    var link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  }

  function downloadAll(slices) {
    if (!slices || !slices.length) return;
    slices.forEach(function (slice, index) {
      setTimeout(function () {
        downloadDataUrl(slice.dataUrl, slice.filename);
      }, index * 140);
    });
  }

  // ─── 工具栏 ───

  function createToolbar() {
    var bar = document.createElement('div');
    bar.className = 'editor-toolbar';

    var leftGroup = document.createElement('div');
    leftGroup.className = 'toolbar-group';
    leftGroup.innerHTML =
      '<button data-command="undo" title="\u64A4\u9500"><svg viewBox="0 0 20 20" width="18" height="18"><path d="M4 8l4-4v3h5a4 4 0 010 8H9v-2h4a2 2 0 000-4H8v3L4 8z" fill="currentColor"/></svg></button>' +
      '<button data-command="redo" title="\u91CD\u505A"><svg viewBox="0 0 20 20" width="18" height="18"><path d="M16 8l-4-4v3H7a4 4 0 000 8h4v-2H7a2 2 0 010-4h5v3l4-4z" fill="currentColor"/></svg></button>' +
      '<span class="toolbar-sep"></span>' +
      '<button data-command="bold" title="\u52A0\u7C97"><strong>B</strong></button>' +
      '<button data-command="italic" title="\u659C\u4F53"><em>I</em></button>' +
      '<span class="toolbar-sep"></span>' +
      '<button data-command="insertUnorderedList" title="\u65E0\u5E8F\u5217\u8868"><svg viewBox="0 0 20 20" width="18" height="18"><circle cx="3" cy="5" r="1.5" fill="currentColor"/><circle cx="3" cy="10" r="1.5" fill="currentColor"/><circle cx="3" cy="15" r="1.5" fill="currentColor"/><rect x="7" y="4" width="11" height="2" rx="1" fill="currentColor"/><rect x="7" y="9" width="11" height="2" rx="1" fill="currentColor"/><rect x="7" y="14" width="11" height="2" rx="1" fill="currentColor"/></svg></button>' +
      '<button data-command="insertOrderedList" title="\u6709\u5E8F\u5217\u8868"><svg viewBox="0 0 20 20" width="18" height="18"><text x="1" y="7" font-size="7" font-weight="700" fill="currentColor">1</text><text x="1" y="12.5" font-size="7" font-weight="700" fill="currentColor">2</text><text x="1" y="18" font-size="7" font-weight="700" fill="currentColor">3</text><rect x="7" y="4" width="11" height="2" rx="1" fill="currentColor"/><rect x="7" y="9" width="11" height="2" rx="1" fill="currentColor"/><rect x="7" y="14" width="11" height="2" rx="1" fill="currentColor"/></svg></button>' +
      '<button data-command="formatBlock" data-value="blockquote" title="\u5F15\u7528"><svg viewBox="0 0 20 20" width="18" height="18"><path d="M3 4h3a3 3 0 013 3v1a3 3 0 01-3 3H5l-1 3H2l1-3a3 3 0 01-1-2V7a3 3 0 011-3zm8 0h3a3 3 0 013 3v1a3 3 0 01-3 3h-1l-1 3h-2l1-3a3 3 0 01-1-2V7a3 3 0 011-3z" fill="currentColor"/></svg></button>' +
      '<span class="toolbar-sep"></span>' +
      '<button data-command="insertImage" title="\u63D2\u5165\u56FE\u7247"><svg viewBox="0 0 20 20" width="18" height="18"><rect x="2" y="3" width="16" height="14" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="7" cy="8" r="2" fill="currentColor"/><path d="M2 14l4-4 3 3 4-5 5 6H2z" fill="currentColor" opacity=".6"/></svg></button>';

    var rightGroup = document.createElement('div');
    rightGroup.className = 'toolbar-group';
    rightGroup.innerHTML =
      '<button data-command="save" class="toolbar-save" title="\u4FDD\u5B58\u7F51\u9875\u6587\u4EF6"><svg viewBox="0 0 20 20" width="16" height="16"><path d="M3 3h11l3 3v11a1 1 0 01-1 1H4a1 1 0 01-1-1V3zm3 0v5h7V3zm1 9a2 2 0 104 0 2 2 0 00-4 0z" fill="currentColor"/></svg> \u4FDD\u5B58</button>' +
      '<button data-command="export" class="toolbar-export" title="\u5BFC\u51FA PNG \u5207\u7247"><svg viewBox="0 0 20 20" width="16" height="16"><path d="M10 3v9m0 0l-3-3m3 3l3-3M4 14v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg> \u5BFC\u51FA</button>';

    bar.appendChild(leftGroup);
    bar.appendChild(rightGroup);

    bar.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-command]');
      if (!btn) return;

      var cmd = btn.dataset.command;
      var val = btn.dataset.value;

      if (cmd === 'export') { exportPage(); return; }
      if (cmd === 'save') { saveHtml(); return; }
      if (cmd === 'insertImage') { triggerImageUpload(); return; }

      editorEl.focus();
      restoreSelection();

      if (cmd === 'formatBlock') {
        document.execCommand(cmd, false, val);
      } else {
        document.execCommand(cmd, false, val || null);
      }

      captureSelection();
    });

    return bar;
  }

  function triggerImageUpload() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.addEventListener('change', function () {
      if (input.files && input.files.length) handleImageFiles(input.files);
    });
    input.click();
  }

  // ─── 导出弹窗 DOM ───

  function createExportModal() {
    overlay = document.createElement('div');
    overlay.className = 'export-overlay';

    dialog = document.createElement('div');
    dialog.className = 'export-dialog';
    dialog.innerHTML =
      '<div class="export-header">' +
        '<h3>\u5BFC\u51FA\u9884\u89C8</h3>' +
        '<span class="export-count"></span>' +
      '</div>' +
      '<div class="export-gallery"></div>' +
      '<div class="export-actions">' +
        '<button class="export-btn-download">\u4E0B\u8F7D\u5168\u90E8</button>' +
        '<button class="export-btn-close">\u5173\u95ED</button>' +
      '</div>';

    dialog.querySelector('.export-btn-download').addEventListener('click', function () {
      downloadAll(exportSlices);
    });
    dialog.querySelector('.export-btn-close').addEventListener('click', hideExportModal);

    overlay.appendChild(dialog);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) hideExportModal();
    });

    return overlay;
  }

  // ─── 初始化 ───

  function init() {
    editorEl = document.querySelector('.article-container');
    if (!editorEl) return;

    editorEl.setAttribute('contenteditable', 'true');

    editorEl.addEventListener('mouseup', captureSelection);
    editorEl.addEventListener('keyup', captureSelection);

    editorEl.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });
    editorEl.addEventListener('drop', function (e) {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files.length) {
        handleImageFiles(e.dataTransfer.files);
      }
    });

    editorEl.addEventListener('paste', function (e) {
      var items = (e.clipboardData || e.originalEvent.clipboardData).items;
      var hasImage = false;
      for (var i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) { hasImage = true; break; }
      }
      if (hasImage) {
        e.preventDefault();
        var files = [];
        for (var j = 0; j < items.length; j++) {
          if (items[j].type.indexOf('image') !== -1) files.push(items[j].getAsFile());
        }
        handleImageFiles(files);
      }
    });

    editorEl.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveHtml();
      }
    });

    toolbar = createToolbar();
    document.body.appendChild(toolbar);

    var modalEl = createExportModal();
    document.body.appendChild(modalEl);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
