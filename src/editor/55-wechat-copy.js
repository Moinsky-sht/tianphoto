  /* ═══ 公众号适配版复制 ═══ */

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getThemeVar(name, fallback) {
    var themeEl = editorEl ? editorEl.querySelector('.article-theme') : null;
    if (!themeEl) return fallback || '';
    var value = getComputedStyle(themeEl).getPropertyValue(name).trim();
    return value || (fallback || '');
  }

  function sanitizeUrl(url) {
    var value = (url || '').trim();
    if (!value) return '';
    if (/^(https?:|data:image\/|blob:)/i.test(value)) return value;
    return '';
  }

  function styleToString(styleMap) {
    return Object.keys(styleMap).map(function (key) {
      return key + ':' + styleMap[key];
    }).join(';');
  }

  function getStyleValue(style, prop) {
    var value = style.getPropertyValue ? style.getPropertyValue(prop) : style[prop];
    return value == null ? '' : String(value).trim();
  }

  function getComputedStyleMap(el, props) {
    if (!el) return {};
    var computed = getComputedStyle(el);
    var map = {};
    props.forEach(function (prop) {
      var value = getStyleValue(computed, prop);
      if (!value) return;
      if (value === 'none' && /(box-shadow|background-image|border-image|filter)/.test(prop)) return;
      map[prop] = value;
    });
    return map;
  }

  function mergeStyleMaps() {
    var merged = {};
    Array.prototype.slice.call(arguments).forEach(function (map) {
      Object.keys(map || {}).forEach(function (key) {
        if (map[key] != null && map[key] !== '') merged[key] = map[key];
      });
    });
    return merged;
  }

  function getBoxStyleFromElement(el, overrides) {
    return mergeStyleMaps(
      getComputedStyleMap(el, [
        'display', 'box-sizing',
        'width', 'min-width', 'max-width',
        'height', 'min-height', 'max-height',
        'position', 'top', 'right', 'bottom', 'left',
        'z-index', 'opacity', 'overflow',
        'gap', 'row-gap', 'column-gap',
        'align-items', 'justify-content', 'justify-items',
        'flex', 'flex-direction', 'flex-wrap',
        'grid-template-columns', 'grid-template-rows',
        'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
        'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
        'background', 'background-color', 'background-image', 'background-size', 'background-position', 'background-repeat',
        'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
        'border-radius', 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius',
        'box-shadow', 'color', 'text-align'
      ]),
      overrides || {}
    );
  }

  function getTextStyleFromElement(el, overrides) {
    return mergeStyleMaps(
      getComputedStyleMap(el, [
        'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
        'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
        'color', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing',
        'text-align', 'text-transform', 'text-decoration', 'font-family', 'white-space'
      ]),
      overrides || {}
    );
  }

  function getImageStyleFromElement(el, overrides) {
    return mergeStyleMaps(
      getComputedStyleMap(el, [
        'display', 'width', 'max-width', 'height', 'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
        'min-width', 'max-height', 'border', 'border-radius', 'box-shadow', 'object-fit', 'opacity'
      ]),
      overrides || {}
    );
  }

  function renderTextTag(tagName, sourceEl, innerHtml, overrides) {
    if (!innerHtml) return '';
    return '<' + tagName + ' style="' + styleToString(getTextStyleFromElement(sourceEl, overrides)) + '">' + innerHtml + '</' + tagName + '>';
  }

  function inlineSvgForClipboard(svgEl) {
    var clone = svgEl.cloneNode(true);
    var sourceNodes = [svgEl].concat(Array.from(svgEl.querySelectorAll('*')));
    var cloneNodes = [clone].concat(Array.from(clone.querySelectorAll('*')));
    var attrsByTag = {
      svg: ['color', 'opacity'],
      stop: ['stop-color', 'stop-opacity'],
      path: ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'opacity'],
      line: ['stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'opacity'],
      polyline: ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'opacity'],
      polygon: ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'opacity'],
      rect: ['fill', 'stroke', 'stroke-width', 'rx', 'ry', 'opacity'],
      circle: ['fill', 'stroke', 'stroke-width', 'opacity'],
      ellipse: ['fill', 'stroke', 'stroke-width', 'opacity']
    };

    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    sourceNodes.forEach(function (sourceNode, index) {
      var targetNode = cloneNodes[index];
      if (!targetNode || sourceNode.nodeType !== Node.ELEMENT_NODE) return;
      var tag = sourceNode.tagName.toLowerCase();
      var computed = getComputedStyle(sourceNode);
      var attrs = attrsByTag[tag] || [];
      attrs.forEach(function (attr) {
        var value = getStyleValue(computed, attr);
        if (!value) return;
        if (value === 'none') return;
        targetNode.setAttribute(attr, value);
      });
      if (tag === 'svg') {
        var color = getStyleValue(computed, 'color');
        if (color) {
          targetNode.setAttribute('color', color);
          targetNode.style.color = color;
        }
      }
    });

    return clone;
  }

  function svgToDataUrl(svgEl) {
    if (!svgEl) return '';
    var serialized = new XMLSerializer().serializeToString(inlineSvgForClipboard(svgEl));
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(serialized);
  }

  function renderSvgImage(svgEl, warnings, overrides, wrapperStyles) {
    if (!svgEl) return '';
    var dataUrl = svgToDataUrl(svgEl);
    if (!dataUrl) return '';
    var imgHtml = '<img src="' + escapeHtml(dataUrl) + '" style="' + styleToString(mergeStyleMaps({
      display: 'block',
      width: '100%',
      'max-width': '100%',
      height: 'auto',
      margin: '0 auto',
      border: '0'
    }, overrides || {})) + '">';
    if (!wrapperStyles) return imgHtml;
    return '<div style="' + styleToString(wrapperStyles) + '">' + imgHtml + '</div>';
  }

  function getWeChatThemeTokens() {
    return {
      accent: getThemeVar('--accent', '#2f43c8'),
      accentStrong: getThemeVar('--accent-strong', '#1f2f8f'),
      accentSoft: getThemeVar('--accent-soft', '#eef3ff'),
      paper: getThemeVar('--paper', '#ffffff'),
      surface: getThemeVar('--surface', '#ffffff'),
      surfaceStrong: getThemeVar('--surface-strong', '#f8f9fc'),
      textMain: getThemeVar('--text-main', '#202124'),
      textMuted: getThemeVar('--text-muted', '#5f6368'),
      heroA: getThemeVar('--hero-grad-a', '#dbe4ff'),
      heroB: getThemeVar('--hero-grad-b', '#6e84ff'),
      heroFade: getThemeVar('--hero-fade', 'rgba(110,132,255,0.16)'),
      headingFont: getThemeVar('--heading-font', '"PingFang SC","Microsoft YaHei",sans-serif'),
      bodyFont: getThemeVar('--body-font', '"PingFang SC","Microsoft YaHei",sans-serif')
    };
  }

  function getPlainTextFromHtml(html) {
    var temp = document.createElement('div');
    temp.innerHTML = html;
    return (temp.innerText || temp.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
  }

  function renderInlineMarkup(node, warnings) {
    if (!node) return '';
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeHtml(node.nodeValue);
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    var tag = node.tagName.toLowerCase();
    if (tag === 'br') return '<br>';
    if (tag === 'strong' || tag === 'b') {
      return '<strong>' + Array.from(node.childNodes).map(function (child) {
        return renderInlineMarkup(child, warnings);
      }).join('') + '</strong>';
    }
    if (tag === 'em' || tag === 'i') {
      return '<em>' + Array.from(node.childNodes).map(function (child) {
        return renderInlineMarkup(child, warnings);
      }).join('') + '</em>';
    }
    if (tag === 'code') {
      return '<code style="' + styleToString({
        padding: '1px 4px',
        'border-radius': '4px',
        background: '#f2f4f8',
        color: '#223',
        'font-family': 'Menlo,Monaco,Consolas,monospace',
        'font-size': '0.92em'
      }) + '">' + Array.from(node.childNodes).map(function (child) {
        return renderInlineMarkup(child, warnings);
      }).join('') + '</code>';
    }
    if (tag === 'a') {
      var href = sanitizeUrl(node.getAttribute('href'));
      var inner = Array.from(node.childNodes).map(function (child) {
        return renderInlineMarkup(child, warnings);
      }).join('');
      if (!href) return inner;
      return '<a href="' + escapeHtml(href) + '" style="' + styleToString(getTextStyleFromElement(node, {
        color: getThemeVar('--accent-strong', '#1f2f8f'),
        'text-decoration': 'underline'
      })) + '">' + inner + '</a>';
    }
    if (tag === 'img') {
      return renderStandaloneImage(node, warnings, node);
    }
    return Array.from(node.childNodes).map(function (child) {
      return renderInlineMarkup(child, warnings);
    }).join('');
  }

  function renderStandaloneImage(imgEl, warnings, styleSourceEl) {
    var src = sanitizeUrl(imgEl.getAttribute('src'));
    if (!src) {
      warnings.push('存在无法直接复制到公众号的本地图片，已跳过。');
      return '';
    }
    if (/^blob:/i.test(src)) {
      warnings.push('存在 blob 图片，粘贴到公众号后可能需要重新上传。');
    }
    if (/^data:image\//i.test(src)) {
      warnings.push('存在 base64 图片，公众号后台不一定完整保留。');
    }
    var alt = imgEl.getAttribute('alt') || '';
    return '<p style="margin:16px 0;text-align:center;">' +
      '<img src="' + escapeHtml(src) + '" alt="' + escapeHtml(alt) + '" style="' + styleToString(getImageStyleFromElement(styleSourceEl || imgEl, {
        width: '100%',
        'max-width': '100%',
        display: 'block',
        margin: '0 auto',
        border: '0'
      })) + '">' +
    '</p>';
  }

  var tpColorProbeCtx = null;

  function getColorProbeContext() {
    if (tpColorProbeCtx) return tpColorProbeCtx;
    var canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    tpColorProbeCtx = canvas.getContext('2d');
    return tpColorProbeCtx;
  }

  function parseCssColor(value) {
    if (!value || value === 'transparent') return null;
    var ctx = getColorProbeContext();
    if (!ctx) return null;
    try {
      ctx.fillStyle = '#000000';
      ctx.fillStyle = value;
    } catch (_err) {
      return null;
    }

    var normalized = ctx.fillStyle || '';
    var hex = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
    if (hex) {
      var raw = hex[1];
      if (raw.length === 3) {
        return {
          r: parseInt(raw.charAt(0) + raw.charAt(0), 16),
          g: parseInt(raw.charAt(1) + raw.charAt(1), 16),
          b: parseInt(raw.charAt(2) + raw.charAt(2), 16),
          a: 1
        };
      }
      if (raw.length === 6 || raw.length === 8) {
        return {
          r: parseInt(raw.slice(0, 2), 16),
          g: parseInt(raw.slice(2, 4), 16),
          b: parseInt(raw.slice(4, 6), 16),
          a: raw.length === 8 ? (parseInt(raw.slice(6, 8), 16) / 255) : 1
        };
      }
    }

    var rgb = normalized.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
    if (!rgb) return null;
    return {
      r: Math.max(0, Math.min(255, Math.round(parseFloat(rgb[1])))),
      g: Math.max(0, Math.min(255, Math.round(parseFloat(rgb[2])))),
      b: Math.max(0, Math.min(255, Math.round(parseFloat(rgb[3])))),
      a: rgb[4] == null ? 1 : Math.max(0, Math.min(1, parseFloat(rgb[4])))
    };
  }

  function rgbToHex(rgb) {
    function part(value) {
      var v = Math.max(0, Math.min(255, Math.round(value)));
      var hex = v.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }
    return '#' + part(rgb.r) + part(rgb.g) + part(rgb.b);
  }

  function blendColorOverWhite(rgb) {
    var alpha = rgb.a == null ? 1 : rgb.a;
    return {
      r: Math.round((rgb.r * alpha) + (255 * (1 - alpha))),
      g: Math.round((rgb.g * alpha) + (255 * (1 - alpha))),
      b: Math.round((rgb.b * alpha) + (255 * (1 - alpha)))
    };
  }

  function isTransparentColor(value) {
    var parsed = parseCssColor(value);
    return !parsed || parsed.a === 0;
  }

  function extractColorFromBackgroundImage(value) {
    if (!value || value === 'none') return '';
    var matches = value.match(/rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}/g) || [];
    for (var i = 0; i < matches.length; i++) {
      if (!isTransparentColor(matches[i])) return matches[i];
    }
    return '';
  }

  function toOpaqueColor(value, fallback) {
    var parsed = parseCssColor(value) || parseCssColor(fallback) || { r: 255, g: 255, b: 255, a: 1 };
    return rgbToHex(blendColorOverWhite(parsed));
  }

  function getCompatibleBackgroundColor(el, fallback) {
    if (!el) return fallback || '#ffffff';
    var cs = getComputedStyle(el);
    var direct = getStyleValue(cs, 'background-color');
    if (!isTransparentColor(direct)) return direct;
    var extracted = extractColorFromBackgroundImage(getStyleValue(cs, 'background-image'));
    if (extracted) return extracted;
    return fallback || '#ffffff';
  }

  function getCompatibleBackgroundImage(el) {
    if (!el) return '';
    var cs = getComputedStyle(el);
    var value = getStyleValue(cs, 'background-image');
    return value && value !== 'none' ? value : '';
  }

  function getCompatibleBorderStyleMap(el, fallbackColor) {
    if (!el) {
      return {
        border: '1px solid ' + (fallbackColor || '#e7eaf0')
      };
    }

    var cs = getComputedStyle(el);
    var styleMap = {};
    ['top', 'right', 'bottom', 'left'].forEach(function (side) {
      var width = getStyleValue(cs, 'border-' + side + '-width');
      var style = getStyleValue(cs, 'border-' + side + '-style');
      var color = getStyleValue(cs, 'border-' + side + '-color');
      if (!width || parseFloat(width) <= 0 || !style || style === 'none') return;
      styleMap['border-' + side] = width + ' ' + style + ' ' + (color || fallbackColor || '#e7eaf0');
    });

    if (Object.keys(styleMap).length) return styleMap;
    return {
      border: '1px solid ' + (fallbackColor || '#e7eaf0')
    };
  }

  function getMarginBottomValue(el, fallback) {
    if (!el) return fallback || '18px';
    var cs = getComputedStyle(el);
    return getStyleValue(cs, 'margin-bottom') || fallback || '18px';
  }

  function getPaddingValue(el, fallback) {
    if (!el) return fallback || '22px 20px';
    var cs = getComputedStyle(el);
    return getStyleValue(cs, 'padding') || fallback || '22px 20px';
  }

  function getRadiusValue(el, fallback) {
    if (!el) return fallback || '24px';
    var cs = getComputedStyle(el);
    return getStyleValue(cs, 'border-radius') || fallback || '24px';
  }

  function getShadowValue(el) {
    if (!el) return '';
    var cs = getComputedStyle(el);
    var value = getStyleValue(cs, 'box-shadow');
    return value && value !== 'none' ? value : '';
  }

  function renderWeChatTable(innerHtml, tdStyle, tdBgColor, sectionStyle) {
    return '<section style="' + styleToString(sectionStyle || { margin: '0 0 18px', padding: '0' }) + '">' +
      '<table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:separate;border-spacing:0;">' +
        '<tr>' +
          '<td bgcolor="' + escapeHtml(toOpaqueColor(tdBgColor, '#ffffff')) + '" style="' + styleToString(tdStyle) + '">' + innerHtml + '</td>' +
        '</tr>' +
      '</table>' +
    '</section>';
  }

  function renderCardShell(el, innerHtml, options) {
    var opts = options || {};
    var hasOwn = Object.prototype.hasOwnProperty;
    var bgColor = hasOwn.call(opts, 'bgColor') ? opts.bgColor : getCompatibleBackgroundColor(el, opts.fallbackBg || '#ffffff');
    var radius = opts.radius || getRadiusValue(el, '24px');
    var padding = opts.padding || getPaddingValue(el, '22px 20px');
    var backgroundImage = hasOwn.call(opts, 'backgroundImage') ? opts.backgroundImage : getCompatibleBackgroundImage(el);
    var tdStyle = mergeStyleMaps({
      padding: opts.leftAccentColor ? '0' : padding,
      color: opts.textColor || getStyleValue(getComputedStyle(el), 'color') || '#202124',
      'background-color': bgColor,
      'border-radius': radius,
      overflow: 'hidden'
    }, getCompatibleBorderStyleMap(el, opts.borderColor || toOpaqueColor(bgColor, opts.fallbackBg || '#ffffff')), opts.tdStyle || {});

    if (backgroundImage && backgroundImage !== 'none') {
      tdStyle['background-image'] = backgroundImage;
      tdStyle['background-size'] = getStyleValue(getComputedStyle(el), 'background-size') || 'cover';
      tdStyle['background-position'] = getStyleValue(getComputedStyle(el), 'background-position') || 'center';
      tdStyle['background-repeat'] = getStyleValue(getComputedStyle(el), 'background-repeat') || 'no-repeat';
    }

    var shadow = hasOwn.call(opts, 'boxShadow') ? opts.boxShadow : getShadowValue(el);
    if (shadow && shadow !== 'none') {
      tdStyle['box-shadow'] = shadow;
    }

    var content = innerHtml;
    if (opts.topAccentColor) {
      content =
        '<table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;border-spacing:0;">' +
          '<tr><td bgcolor="' + escapeHtml(toOpaqueColor(opts.topAccentColor, bgColor)) + '" style="height:' + escapeHtml(opts.topAccentHeight || '4px') + ';line-height:0;font-size:0;background-color:' + escapeHtml(opts.topAccentColor) + ';">&nbsp;</td></tr>' +
          '<tr><td style="padding:' + escapeHtml(padding) + ';">' + innerHtml + '</td></tr>' +
        '</table>';
    } else if (opts.leftAccentColor) {
      content =
        '<table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;border-spacing:0;">' +
          '<tr>' +
            '<td bgcolor="' + escapeHtml(toOpaqueColor(opts.leftAccentColor, bgColor)) + '" style="width:' + escapeHtml(opts.leftAccentWidth || '4px') + ';line-height:0;font-size:0;background-color:' + escapeHtml(opts.leftAccentColor) + ';">&nbsp;</td>' +
            '<td style="padding:' + escapeHtml(padding) + ';">' + innerHtml + '</td>' +
          '</tr>' +
        '</table>';
    }

    return renderWeChatTable(
      content,
      tdStyle,
      bgColor,
      mergeStyleMaps({
        margin: '0 0 ' + getMarginBottomValue(el, '18px'),
        padding: '0'
      }, opts.sectionStyle || {})
    );
  }

  function renderSectionIconBox(card, tokens, warnings) {
    var iconEl = card.querySelector('.wx-section-icon');
    if (!iconEl) return '';
    var iconBg = getCompatibleBackgroundColor(iconEl, tokens.surface);
    var svg = iconEl.querySelector('svg');
    var inner = svg ? renderSvgImage(svg, warnings, {
      width: '20px',
      'max-width': '20px',
      display: 'block',
      margin: '0 auto'
    }, null) : '<span style="display:inline-block;width:10px;height:10px;border-radius:999px;background-color:' + escapeHtml(tokens.accentStrong) + ';font-size:0;line-height:0;">&nbsp;</span>';

    return '<td width="56" valign="top" style="width:56px;padding-right:12px;">' +
      '<table cellpadding="0" cellspacing="0" border="0" width="48" style="width:48px;border-collapse:separate;border-spacing:0;">' +
        '<tr>' +
          '<td bgcolor="' + escapeHtml(toOpaqueColor(iconBg, tokens.surface)) + '" style="' + styleToString(mergeStyleMaps({
            padding: '12px',
            'text-align': 'center',
            'vertical-align': 'middle',
            'background-color': iconBg,
            'border-radius': getRadiusValue(iconEl, '16px')
          }, getCompatibleBorderStyleMap(iconEl, tokens.accentSoft))) + '">' + inner + '</td>' +
        '</tr>' +
      '</table>' +
    '</td>';
  }

  function renderSectionMarkBadge(heading, tokens) {
    if (!heading) return '';
    var markEl = heading.querySelector('.wx-section-mark');
    if (!markEl) return '';
    var bgColor = getCompatibleBackgroundColor(markEl, tokens.surface);
    var markKind = (markEl.getAttribute('data-mark-kind') || '').trim();
    var label = markKind ? markKind.charAt(0).toUpperCase() : '·';
    return '<span style="' + styleToString(mergeStyleMaps({
      display: 'inline-block',
      width: '20px',
      height: '20px',
      'line-height': '20px',
      'text-align': 'center',
      'font-size': '11px',
      'font-weight': '700',
      color: tokens.accentStrong,
      'background-color': bgColor,
      'border-radius': '999px'
    }, getCompatibleBorderStyleMap(markEl, tokens.accentSoft))) + '">' + escapeHtml(label) + '</span>';
  }

  function renderHeroVisual(card, tokens, warnings) {
    var meshEl = card.querySelector('.wx-hero-mesh');
    var heroSvg = meshEl ? meshEl.querySelector('svg') : null;
    var bgColor = getCompatibleBackgroundColor(meshEl || card, tokens.heroA);
    var imageHtml = heroSvg ? renderSvgImage(heroSvg, warnings, {
      width: '100%',
      'max-width': '100%',
      display: 'block',
      margin: '0'
    }, null) : '<p style="margin:0;height:88px;line-height:88px;font-size:0;">&nbsp;</p>';

    return renderWeChatTable(
      imageHtml,
      {
        padding: '0',
        overflow: 'hidden',
        'background-color': bgColor,
        'border-radius': '18px'
      },
      bgColor,
      { margin: '0 0 14px', padding: '0' }
    );
  }

  function renderInlineGraphicCard(node, tokens, warnings) {
    var svg = node.querySelector('svg');
    var bgColor = getCompatibleBackgroundColor(node, tokens.surfaceStrong);
    var label = node.getAttribute('data-infographic-kind') || '结构示意';
    var inner =
      (svg ? renderWeChatTable(
        renderSvgImage(svg, warnings, {
          width: '100%',
          'max-width': '220px',
          display: 'block',
          margin: '0 auto'
        }, null),
        {
          padding: '12px',
          'text-align': 'center',
          'background-color': bgColor,
          'border-radius': '14px'
        },
        bgColor,
        { margin: '0 0 10px', padding: '0' }
      ) : '') +
      '<p style="' + styleToString({
        margin: '0',
        color: tokens.textMuted,
        'font-size': '13px',
        'line-height': '1.6',
        'text-align': 'center',
        'font-family': tokens.bodyFont
      }) + '">' + escapeHtml(label.replace(/-/g, ' ')) + '</p>';

    return renderCardShell(node, inner, {
      bgColor: bgColor,
      padding: '16px 16px 14px',
      fallbackBg: tokens.surfaceStrong
    });
  }

  function renderBodyTable(tableEl, warnings, tokens) {
    var rows = Array.from(tableEl.rows || []).map(function (row) {
      var cells = Array.from(row.cells || []).map(function (cell) {
        var html = Array.from(cell.childNodes).map(function (child) {
          return renderBodyNode(child, tokens, warnings);
        }).join('') || escapeHtml(cell.textContent || '');
        return '<td' +
          (cell.colSpan > 1 ? ' colspan="' + escapeHtml(String(cell.colSpan)) + '"' : '') +
          (cell.rowSpan > 1 ? ' rowspan="' + escapeHtml(String(cell.rowSpan)) + '"' : '') +
          ' bgcolor="' + escapeHtml(toOpaqueColor(getCompatibleBackgroundColor(cell, '#ffffff'), '#ffffff')) + '"' +
          ' style="' + styleToString(mergeStyleMaps({
            padding: getPaddingValue(cell, '10px 12px'),
            'background-color': getCompatibleBackgroundColor(cell, '#ffffff'),
            color: getStyleValue(getComputedStyle(cell), 'color') || tokens.textMain,
            'vertical-align': getStyleValue(getComputedStyle(cell), 'vertical-align') || 'top'
          }, getCompatibleBorderStyleMap(cell, '#d9dde6'))) + '">' + html + '</td>';
      }).join('');
      return '<tr>' + cells + '</tr>';
    }).join('');

    return '<section style="margin:16px 0;padding:0;overflow-x:auto;">' +
      '<table cellpadding="0" cellspacing="0" border="0" width="100%" style="' + styleToString(mergeStyleMaps({
        width: '100%',
        'border-collapse': 'collapse',
        'border-spacing': '0',
        color: tokens.textMain,
        'font-family': tokens.bodyFont,
        'font-size': '14px',
        'line-height': '1.7'
      }, getComputedStyleMap(tableEl, ['table-layout']))) + '">' + rows + '</table>' +
    '</section>';
  }

  function normalizeCloneTag(tag) {
    var blockAliases = {
      section: 'div',
      article: 'div',
      main: 'div',
      header: 'div',
      footer: 'div',
      figure: 'div',
      figcaption: 'p'
    };
    return blockAliases[tag] || tag;
  }

  function getCloneStyleFromElement(el, tagName, overrides) {
    var style = mergeStyleMaps(
      getBoxStyleFromElement(el, {}),
      getTextStyleFromElement(el, {})
    );

    if (tagName === 'ul' || tagName === 'ol') {
      style = mergeStyleMaps(style, getComputedStyleMap(el, [
        'list-style-type', 'list-style-position'
      ]));
    }

    if (tagName === 'li') {
      style = mergeStyleMaps(style, getComputedStyleMap(el, [
        'list-style-type'
      ]));
    }

    if (tagName === 'table' || tagName === 'tbody' || tagName === 'thead' || tagName === 'tr' || tagName === 'td' || tagName === 'th') {
      style = mergeStyleMaps(style, getComputedStyleMap(el, [
        'border-collapse', 'border-spacing', 'vertical-align'
      ]));
    }

    if (style.display === 'grid') style.display = 'block';
    if (style.display === 'inline-flex') style.display = 'inline-block';
    if (style.display === 'flex') style.display = 'block';
    if (style.position === 'absolute' || style.position === 'fixed' || style.position === 'sticky') {
      style.position = 'relative';
      delete style.top;
      delete style.right;
      delete style.bottom;
      delete style.left;
    }

    return mergeStyleMaps(style, overrides || {});
  }

  function renderDomClone(node, warnings) {
    if (!node) return '';
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeHtml(node.nodeValue);
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    var tag = node.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style' || tag === 'button' || tag === 'textarea' || tag === 'input') {
      return '';
    }

    if (tag === 'svg') {
      return renderSvgImage(node, warnings, {
        width: getStyleValue(getComputedStyle(node), 'width') || '100%',
        height: 'auto'
      });
    }

    if (tag === 'img') {
      var src = sanitizeUrl(node.getAttribute('src'));
      if (!src) {
        warnings.push('存在无法直接复制到公众号的本地图片，已跳过。');
        return '';
      }
      return '<img src="' + escapeHtml(src) + '" alt="' + escapeHtml(node.getAttribute('alt') || '') + '" style="' +
        styleToString(getImageStyleFromElement(node, {
          display: 'block',
          'max-width': '100%'
        })) +
      '">';
    }

    if (/\bwx-hero-mesh\b/.test(node.className || '')) {
      var meshSvg = node.querySelector('svg');
      return meshSvg ? renderSvgImage(meshSvg, warnings, {
        width: '100%',
        'max-width': '100%'
      }, {
        margin: '0 0 14px'
      }) : '';
    }

    var mappedTag = normalizeCloneTag(tag);
    var innerHtml = Array.from(node.childNodes).map(function (child) {
      return renderDomClone(child, warnings);
    }).join('');
    if (!innerHtml.trim() && mappedTag !== 'img' && mappedTag !== 'br' && mappedTag !== 'hr') {
      return '';
    }

    var attrs = '';
    if (mappedTag === 'a') {
      var href = sanitizeUrl(node.getAttribute('href'));
      if (href) {
        attrs += ' href="' + escapeHtml(href) + '"';
      }
    }
    if (node.hasAttribute('colspan')) attrs += ' colspan="' + escapeHtml(node.getAttribute('colspan')) + '"';
    if (node.hasAttribute('rowspan')) attrs += ' rowspan="' + escapeHtml(node.getAttribute('rowspan')) + '"';

    var style = getCloneStyleFromElement(node, mappedTag, {});
    return '<' + mappedTag + attrs + ' style="' + styleToString(style) + '">' + innerHtml + '</' + mappedTag + '>';
  }

  function renderBodyNode(node, tokens, warnings) {
    if (!node) return '';
    if (node.nodeType === Node.TEXT_NODE) {
      var text = String(node.nodeValue || '').trim();
      return text ? '<p style="' + styleToString({
        margin: '0 0 14px',
        color: tokens.textMain,
        'font-size': '16px',
        'line-height': '1.8',
        'font-family': tokens.bodyFont
      }) + '">' + escapeHtml(text) + '</p>' : '';
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    var tag = node.tagName.toLowerCase();
    var className = node.className || '';

    if (/\bwx-inline-graphic\b/.test(className)) {
      return renderInlineGraphicCard(node, tokens, warnings);
    }

    if (tag === 'p') {
      var pHtml = Array.from(node.childNodes).map(function (child) {
        return renderInlineMarkup(child, warnings);
      }).join('').trim();
      if (!pHtml) return '';
      return renderTextTag('p', node, pHtml, {
        'text-align': getStyleValue(getComputedStyle(node), 'text-align') || 'justify'
      });
    }

    if (tag === 'ul' || tag === 'ol') {
      var listStyle = tag === 'ol' ? 'decimal' : 'disc';
      var items = Array.from(node.children).map(function (child) {
        return renderBodyNode(child, tokens, warnings);
      }).join('');
      if (!items) return '';
      return '<' + tag + ' style="' + styleToString(getTextStyleFromElement(node, {
        'list-style-type': listStyle,
        'padding-left': '1.4em'
      })) + '">' + items + '</' + tag + '>';
    }

    if (tag === 'li') {
      var liHtml = Array.from(node.childNodes).map(function (child) {
        return renderInlineMarkup(child, warnings);
      }).join('').trim();
      if (!liHtml) return '';
      return '<li style="' + styleToString(getTextStyleFromElement(node, {
        margin: '0 0 8px'
      })) + '">' + liHtml + '</li>';
    }

    if (tag === 'blockquote' || /\bwx-quote-card\b/.test(className)) {
      var quoteHtml = Array.from(node.childNodes).map(function (child) {
        return renderInlineMarkup(child, warnings);
      }).join('').trim();
      if (!quoteHtml) return '';
      return '<blockquote style="' + styleToString(mergeStyleMaps(
        getBoxStyleFromElement(node, {
          margin: '16px 0'
        }),
        getTextStyleFromElement(node, {})
      )) + '">' + quoteHtml + '</blockquote>';
    }

    if (tag === 'h3') {
      var h3Html = Array.from(node.childNodes).map(function (child) {
        return renderInlineMarkup(child, warnings);
      }).join('').trim();
      if (!h3Html) return '';
      return renderTextTag('h3', node, h3Html, {});
    }

    if (tag === 'hr' || /\bwx-divider-ornament\b/.test(className)) {
      return '<section style="margin:18px 0;padding:0;"><table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;border-spacing:0;"><tr><td bgcolor="' + escapeHtml(toOpaqueColor(tokens.accentSoft, '#f2f4f8')) + '" style="height:1px;line-height:0;font-size:0;background-color:' + escapeHtml(tokens.accentSoft) + ';">&nbsp;</td></tr></table></section>';
    }

    if (tag === 'img') {
      return renderStandaloneImage(node, warnings, node);
    }

    if (tag === 'figure' || /\bwx-media-frame\b/.test(className)) {
      var img = node.querySelector('img');
      return img ? renderStandaloneImage(img, warnings, img) : '';
    }

    if (tag === 'table') {
      return renderBodyTable(node, warnings, tokens);
    }

    return Array.from(node.childNodes).map(function (child) {
      return renderBodyNode(child, tokens, warnings);
    }).join('');
  }

  function renderBodyContent(bodyEl, tokens, warnings) {
    if (!bodyEl) return '';
    return Array.from(bodyEl.childNodes).map(function (child) {
      return renderBodyNode(child, tokens, warnings);
    }).join('');
  }

  function renderPillGrid(pillGrid, tokens, warnings) {
    if (!pillGrid) return '';
    var pills = Array.from(pillGrid.children).map(function (pill) {
      var text = (pill.textContent || '').trim();
      if (!text) return '';
      return '<span style="' + styleToString({
        display: 'inline-block',
        margin: '0 8px 8px 0',
        padding: '4px 10px',
        'border-radius': '999px',
        background: tokens.accentSoft,
        color: tokens.accentStrong,
        'font-size': '12px',
        'line-height': '1.4'
      }) + '">' + escapeHtml(text) + '</span>';
    }).filter(Boolean).join('');
    return pills ? '<section style="margin-top:14px;padding:0;">' + pills + '</section>' : '';
  }

  function renderBrandBanner(banner, tokens, warnings) {
    if (!banner) return '';
    var title = (banner.querySelector('.phone-brand-copy strong') || {}).textContent || '';
    var subtitle = (banner.querySelector('.phone-brand-copy small') || {}).textContent || '';
    var overline = (banner.querySelector('.phone-brand-overline') || {}).textContent || '';
    var chip = (banner.querySelector('.phone-brand-chip') || {}).textContent || '';
    var img = banner.querySelector('.phone-brand-mark img');
    var logoHtml = '';

    if (img) {
      var src = sanitizeUrl(img.getAttribute('src'));
      if (src && !/^blob:/i.test(src)) {
        logoHtml = '<td style="width:52px;vertical-align:top;padding-right:12px;">' +
          '<img src="' + escapeHtml(src) + '" style="display:block;width:52px;height:52px;border-radius:14px;border:0;">' +
        '</td>';
      } else if (src) {
        warnings.push('品牌 logo 使用了本地 blob 地址，粘贴到公众号后可能需要重新上传。');
      }
    }

    return '<section style="margin:0 0 18px;padding:0;">' +
      '<table cellpadding="0" cellspacing="0" border="0" width="100%" style="' + styleToString({
        width: '100%',
        padding: '0',
        'border-collapse': 'separate',
        'border-spacing': '0'
      }) + '"><tr><td bgcolor="' + escapeHtml(toOpaqueColor(tokens.surface, '#ffffff')) + '" style="' + styleToString({
        padding: '14px 16px',
        'background-color': tokens.surface,
        border: '1px solid ' + tokens.accentSoft,
        'border-radius': '16px'
      }) + '">' +
      '<table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>' +
      logoHtml +
      '<td style="vertical-align:top;">' +
        (overline ? '<p style="margin:0 0 4px;color:' + escapeHtml(tokens.textMuted) + ';font-size:10px;letter-spacing:0.12em;text-transform:uppercase;">' + escapeHtml(overline.trim()) + '</p>' : '') +
        (title ? '<p style="margin:0;color:' + escapeHtml(tokens.textMain) + ';font-size:16px;font-weight:700;line-height:1.35;">' + escapeHtml(title.trim()) + '</p>' : '') +
        (subtitle ? '<p style="margin:4px 0 0;color:' + escapeHtml(tokens.textMuted) + ';font-size:12px;line-height:1.6;">' + escapeHtml(subtitle.trim()) + '</p>' : '') +
      '</td>' +
      (chip ? '<td style="width:1%;white-space:nowrap;vertical-align:top;padding-left:10px;"><span style="display:inline-block;padding:4px 10px;border-radius:999px;background:' + escapeHtml(tokens.accentSoft) + ';color:' + escapeHtml(tokens.accentStrong) + ';font-size:11px;font-weight:700;">' + escapeHtml(chip.trim()) + '</span></td>' : '') +
      '</tr></table>' +
    '</td></tr></table></section>';
  }

  function renderSectionMarkImage(heading, warnings) {
    if (!heading) return '';
    var svg = heading.querySelector('.wx-section-mark svg');
    if (!svg) return '';
    return renderSvgImage(svg, warnings, {
      width: '22px',
      'max-width': '22px'
    }, null);
  }

  function renderHeroCard(card, tokens, warnings) {
    var eyebrow = (card.querySelector('.wx-eyebrow') || {}).textContent || '';
    var title = (card.querySelector('h1') || {}).textContent || '';
    var lead = (card.querySelector('.wx-lead') || {}).textContent || '';
    var pills = renderPillGrid(card.querySelector('.wx-pill-grid'), tokens, warnings);
    var inner =
      renderHeroVisual(card, tokens, warnings) +
      (eyebrow ? renderTextTag('p', card.querySelector('.wx-eyebrow') || card, escapeHtml(eyebrow.trim()), {}) : '') +
      (title ? renderTextTag('h1', card.querySelector('h1') || card, escapeHtml(title.trim()), {}) : '') +
      (lead ? renderTextTag('p', card.querySelector('.wx-lead') || card, escapeHtml(lead.trim()), {}) : '') +
      pills;

    return renderCardShell(card, inner, {
      topAccentColor: tokens.accentSoft,
      topAccentHeight: '3px',
      fallbackBg: tokens.surface
    });
  }

  function renderSimpleCard(card, tokens, warnings) {
    var captionEl = card.querySelector('.wx-card-caption');
    var bodyEl = card.querySelector('.wx-section-body');
    var bodyHtml = renderBodyContent(bodyEl || card, tokens, warnings);
    var inner = (captionEl ? renderTextTag('p', captionEl, escapeHtml((captionEl.textContent || '').trim()), {}) : '') + bodyHtml;
    return renderCardShell(card, inner, {
      fallbackBg: tokens.surfaceStrong
    });
  }

  function renderSectionCard(card, tokens, warnings) {
    var heading = card.querySelector('.wx-section-heading');
    var indexText = heading ? (heading.querySelector('.wx-section-index') || {}).textContent || '' : '';
    var captionText = heading ? (heading.querySelector('.wx-card-caption') || {}).textContent || '' : '';
    var titleText = heading ? (heading.querySelector('h2') || {}).textContent || '' : '';
    var bodyEl = card.querySelector('.wx-section-body');
    var bodyHtml = renderBodyContent(bodyEl || card, tokens, warnings);
    if (!titleText && !bodyHtml) return '';

    var metaText = [];
    if (indexText.trim()) metaText.push(escapeHtml(indexText.trim()));
    if (captionText.trim()) metaText.push(escapeHtml(captionText.trim()));
    var markHtml = renderSectionMarkBadge(heading, tokens);
    var iconCell = renderSectionIconBox(card, tokens, warnings);
    var headingHtml =
      '<table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;border-spacing:0;margin:0 0 12px;">' +
        '<tr>' +
          iconCell +
          '<td valign="top" style="vertical-align:top;">' +
            '<table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;border-spacing:0;">' +
              '<tr>' +
                '<td style="vertical-align:middle;padding:0 0 8px;">' +
                  (metaText.length ? renderTextTag('p', heading.querySelector('.wx-card-caption') || heading, metaText.join(' &nbsp;·&nbsp; '), {
                    margin: '0'
                  }) : '') +
                '</td>' +
                '<td width="24" align="right" style="width:24px;vertical-align:middle;padding:0 0 8px 8px;">' + markHtml + '</td>' +
              '</tr>' +
              '<tr>' +
                '<td colspan="2" style="padding:0;">' +
                  (titleText.trim() ? renderTextTag('h2', heading.querySelector('h2') || heading, escapeHtml(titleText.trim()), {}) : '') +
                '</td>' +
              '</tr>' +
            '</table>' +
          '</td>' +
        '</tr>' +
      '</table>';

    return renderCardShell(card, headingHtml + bodyHtml, {
      leftAccentColor: tokens.accentSoft,
      leftAccentWidth: '3px',
      fallbackBg: tokens.surfaceStrong
    });
  }

  function renderMetricGrid(grid, tokens, warnings) {
    var cards = Array.from(grid.querySelectorAll('.wx-metric-card')).map(function (card) {
      var title = (card.querySelector('strong') || {}).textContent || '';
      var text = (card.querySelector('span') || {}).textContent || '';
      if (!title.trim() && !text.trim()) return '';
      return '<td style="width:50%;vertical-align:top;padding:0 6px 12px 0;">' +
        '<table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:separate;border-spacing:0;">' +
          '<tr>' +
            '<td bgcolor="' + escapeHtml(toOpaqueColor(getCompatibleBackgroundColor(card, tokens.surface), tokens.surface)) + '" style="' + styleToString(mergeStyleMaps({
              padding: getPaddingValue(card, '18px 16px 16px'),
              'background-color': getCompatibleBackgroundColor(card, tokens.surface),
              'border-radius': getRadiusValue(card, '18px')
            }, getCompatibleBorderStyleMap(card, tokens.accentSoft))) + '">' +
              renderTextTag('p', card.querySelector('strong') || card, escapeHtml(title.trim()), {}) +
              renderTextTag('p', card.querySelector('span') || card, escapeHtml(text.trim()), {}) +
            '</td>' +
          '</tr>' +
        '</table>' +
      '</td>';
    }).filter(Boolean);

    if (!cards.length) return '';
    var rows = [];
    for (var i = 0; i < cards.length; i += 2) {
      rows.push('<tr>' + cards[i] + (cards[i + 1] || '<td style="width:50%;padding:0 0 12px;"></td>') + '</tr>');
    }
    return '<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px;border-collapse:collapse;">' + rows.join('') + '</table>';
  }

  function renderCompareGrid(grid, tokens, warnings) {
    var cards = Array.from(grid.querySelectorAll('.wx-compare-card')).map(function (card) {
      var title = (card.querySelector('h3') || {}).textContent || '';
      var text = (card.querySelector('p') || {}).textContent || '';
      if (!title.trim() && !text.trim()) return '';
      return '<td style="width:100%;vertical-align:top;padding:0 0 12px;">' +
        '<table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:separate;border-spacing:0;">' +
          '<tr>' +
            '<td bgcolor="' + escapeHtml(toOpaqueColor(getCompatibleBackgroundColor(card, tokens.surface), tokens.surface)) + '" style="' + styleToString(mergeStyleMaps({
              padding: getPaddingValue(card, '18px 16px 16px'),
              'background-color': getCompatibleBackgroundColor(card, tokens.surface),
              'border-radius': getRadiusValue(card, '18px')
            }, getCompatibleBorderStyleMap(card, tokens.accentSoft))) + '">' +
              renderTextTag('p', card.querySelector('h3') || card, escapeHtml(title.trim()), {}) +
              renderTextTag('p', card.querySelector('p') || card, escapeHtml(text.trim()), {}) +
            '</td>' +
          '</tr>' +
        '</table>' +
      '</td>';
    }).filter(Boolean);

    if (!cards.length) return '';
    var rows = cards.map(function (cardHtml) {
      return '<tr>' + cardHtml + '</tr>';
    });
    return '<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px;border-collapse:collapse;">' + rows.join('') + '</table>';
  }

  function renderTimelineCard(card, tokens, warnings) {
    var items = Array.from(card.querySelectorAll('.wx-timeline-item')).map(function (item, index, list) {
      var title = (item.querySelector('strong') || {}).textContent || '';
      var text = (item.querySelector('p') || {}).textContent || '';
      if (!title.trim() && !text.trim()) return '';
      var dot = '<span style="display:inline-block;width:10px;height:10px;border-radius:999px;background-color:' + escapeHtml(tokens.accent) + ';font-size:0;line-height:0;">&nbsp;</span>';
      var line = index < list.length - 1
        ? '<p style="width:2px;height:34px;margin:6px auto 0;background-color:' + escapeHtml(tokens.accentSoft) + ';font-size:0;line-height:0;">&nbsp;</p>'
        : '';
      return '<tr>' +
        '<td width="22" valign="top" align="center" style="width:22px;vertical-align:top;padding:2px 12px 12px 0;">' + dot + line + '</td>' +
        '<td valign="top" style="vertical-align:top;padding:0 0 12px;">' +
          renderTextTag('p', item.querySelector('strong') || item, escapeHtml(title.trim()), {}) +
          renderTextTag('p', item.querySelector('p') || item, escapeHtml(text.trim()), {}) +
        '</td>' +
      '</tr>';
    }).filter(Boolean).join('');
    return items ? renderCardShell(card, '<table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;border-spacing:0;">' + items + '</table>', {
      fallbackBg: tokens.surfaceStrong
    }) : '';
  }

  function renderSummaryCard(card, tokens, warnings) {
    var html = renderBodyContent(card, tokens, warnings);
    return renderCardShell(card, html, {
      fallbackBg: tokens.surfaceStrong
    });
  }

  function renderGenericBlock(block, tokens, warnings) {
    return renderBodyContent(block, tokens, warnings);
  }

  function renderQuoteCard(card, tokens, warnings) {
    var html = renderBodyContent(card, tokens, warnings);
    return renderCardShell(card, html, {
      bgColor: getCompatibleBackgroundColor(card, tokens.accentSoft),
      leftAccentColor: tokens.accent,
      leftAccentWidth: '4px',
      fallbackBg: tokens.accentSoft
    });
  }

  function renderWeChatBlock(block, tokens, warnings) {
    if (!block || block.nodeType !== Node.ELEMENT_NODE) return '';
    var className = block.className || '';

    if (/\bwx-hero-card\b/.test(className)) return renderHeroCard(block, tokens, warnings);
    if (/\bwx-intro-card\b/.test(className)) return renderSimpleCard(block, tokens, warnings);
    if (/\bwx-section-card\b/.test(className)) return renderSectionCard(block, tokens, warnings);
    if (/\bwx-metric-grid\b/.test(className)) return renderMetricGrid(block, tokens, warnings);
    if (/\bwx-compare-grid\b/.test(className)) return renderCompareGrid(block, tokens, warnings);
    if (/\bwx-timeline-card\b/.test(className)) return renderTimelineCard(block, tokens, warnings);
    if (/\bwx-quote-card\b/.test(className)) return renderQuoteCard(block, tokens, warnings);
    if (/\bwx-summary-card\b/.test(className)) return renderSummaryCard(block, tokens, warnings);
    if (/\bwx-divider-ornament\b/.test(className)) return '<section style="margin:18px 0;padding:0;"><table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;border-spacing:0;"><tr><td bgcolor="' + escapeHtml(toOpaqueColor(tokens.accentSoft, '#f2f4f8')) + '" style="height:1px;line-height:0;font-size:0;background-color:' + escapeHtml(tokens.accentSoft) + ';">&nbsp;</td></tr></table></section>';
    if (/\bwx-media-frame\b/.test(className) || block.tagName.toLowerCase() === 'figure') {
      var img = block.querySelector('img');
      return img ? renderStandaloneImage(img, warnings) : '';
    }
    return renderGenericBlock(block, tokens, warnings);
  }

  function getWeChatSemanticBlockType(block) {
    if (!block || block.nodeType !== Node.ELEMENT_NODE) return '';
    var className = block.className || '';
    var tagName = block.tagName.toLowerCase();
    if (/\bwx-hero-card\b/.test(className)) return 'hero';
    if (/\bwx-intro-card\b/.test(className)) return 'intro';
    if (/\bwx-section-card\b/.test(className)) return 'section';
    if (/\bwx-metric-grid\b/.test(className)) return 'metric';
    if (/\bwx-compare-grid\b/.test(className)) return 'compare';
    if (/\bwx-timeline-card\b/.test(className)) return 'timeline';
    if (/\bwx-quote-card\b/.test(className)) return 'quote';
    if (/\bwx-summary-card\b/.test(className)) return 'summary';
    if (/\bwx-inline-graphic\b/.test(className)) return 'note';
    if (/\bwx-media-frame\b/.test(className) || tagName === 'figure') return 'image';
    if (/\bwx-divider-ornament\b/.test(className) || tagName === 'hr') return 'divider';
    return 'generic';
  }

  function collectWeChatSemanticBlocks(shell) {
    return Array.from(shell.children || []).map(function (child) {
      return {
        type: getWeChatSemanticBlockType(child),
        element: child
      };
    }).filter(function (block) {
      return !!block.type;
    });
  }

  function uniqueWarnings(items) {
    return (items || []).filter(function (item, index, list) {
      return item && list.indexOf(item) === index;
    });
  }

  function pushWeChatBlocks(target, value) {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(function (entry) {
        pushWeChatBlocks(target, entry);
      });
      return;
    }
    target.push(value);
  }

  function getWeChatArticleEl() {
    if (!editorEl) return null;
    return editorEl.querySelector('.article-theme') ||
      editorEl.querySelector('article[data-ui-mode]') ||
      editorEl.querySelector('article');
  }

  function getWeChatShell(articleEl) {
    if (!articleEl) return null;
    return articleEl.querySelector('.wx-article-shell') ||
      articleEl.querySelector('.tp-free-shell') ||
      articleEl;
  }

  function getWeChatUiMode(articleEl) {
    if (!articleEl) return 'rule';
    return (articleEl.getAttribute('data-ui-mode') || 'rule').trim() || 'rule';
  }

  function getWeChatContentTemplate(articleEl) {
    if (!articleEl) return 'knowledge-article';
    return (articleEl.getAttribute('data-content-template') || 'knowledge-article').trim() || 'knowledge-article';
  }

  function getWeChatDocType(contentTemplate) {
    if (contentTemplate === 'weekly-report' || contentTemplate === 'release-brief' || contentTemplate === 'event-notice') {
      return 'report';
    }
    if (contentTemplate === 'case-recap') {
      return 'brand';
    }
    return 'knowledge';
  }

  function getWeChatTemplatePackId(contentTemplate) {
    if (contentTemplate === 'weekly-report' || contentTemplate === 'release-brief' || contentTemplate === 'event-notice') {
      return 'weekly-briefing';
    }
    if (contentTemplate === 'case-recap') {
      return 'brand-feature';
    }
    return 'knowledge-editorial';
  }

  function getWeChatHeadingSystem(articleEl) {
    if (!articleEl) return 'index-led';
    return (articleEl.getAttribute('data-heading-system') || 'index-led').trim() || 'index-led';
  }

  function getWeChatStyleFamily(articleEl) {
    if (!articleEl) return '';
    return (articleEl.getAttribute('data-style-family') || '').trim();
  }

  function getWeChatFamilyBridgeId(articleEl) {
    var family = getWeChatStyleFamily(articleEl);
    if (/^(swiss-journal|ledger-spec|brief-bulletin|skyline-pane)$/.test(family)) return 'editorial';
    if (/^(archive-paper|salon-luxe|night-gallery)$/.test(family)) return 'archive';
    if (/^(field-atlas)$/.test(family)) return 'atlas';
    if (/^(ops-console|neon-signal)$/.test(family)) return 'signal';
    if (/^(studio-ribbon|deck-story)$/.test(family)) return 'ribbon';
    if (/^(aurora-drift)$/.test(family)) return 'aurora';
    if (/^(poster-brutal|play-lab)$/.test(family)) return 'poster';
    return 'editorial';
  }

  function getWeChatPaletteBridge(articleEl) {
    var themeTokens = getWeChatThemeTokens();
    var surfaceEl = articleEl ? (
      articleEl.querySelector('.wx-section-card, .wx-intro-card, .wx-hero-card, .wx-summary-card, .wx-quote-card') ||
      articleEl.querySelector('.tp-free-panel, .tp-free-note, .tp-free-hero') ||
      articleEl
    ) : null;
    var quoteEl = articleEl ? (
      articleEl.querySelector('.wx-section-body blockquote, .wx-quote-card, .tp-free-quote') ||
      surfaceEl
    ) : surfaceEl;
    var borderSource = surfaceEl ? getComputedStyle(surfaceEl) : null;
    var borderTint = toOpaqueColor(
      borderSource ? (
        getStyleValue(borderSource, 'border-top-color') ||
        getStyleValue(borderSource, 'border-color')
      ) : '',
      themeTokens.accentSoft || '#EEF5FF'
    );
    var surfaceTint = toOpaqueColor(
      getCompatibleBackgroundColor(surfaceEl, themeTokens.surfaceStrong || themeTokens.surface || themeTokens.paper),
      themeTokens.paper || '#FFFFFF'
    );
    var quoteTint = toOpaqueColor(
      getCompatibleBackgroundColor(quoteEl, themeTokens.accentSoft || surfaceTint),
      surfaceTint
    );

    return {
      title: toOpaqueColor(themeTokens.textMain, '#111111'),
      textMain: toOpaqueColor(themeTokens.textMain, '#333333'),
      textMuted: toOpaqueColor(themeTokens.textMuted, '#666666'),
      accent: toOpaqueColor(themeTokens.accent, '#1677FF'),
      accentStrong: toOpaqueColor(themeTokens.accentStrong || themeTokens.accent, '#125FD1'),
      accentSoft: toOpaqueColor(themeTokens.accentSoft, '#EEF5FF'),
      paper: toOpaqueColor(themeTokens.paper, '#FFFFFF'),
      cardBg: surfaceTint,
      cardAltBg: quoteTint,
      quoteBg: quoteTint,
      border: borderTint,
      divider: borderTint
    };
  }

  function getWeChatFamilyHint(articleEl) {
    var family = articleEl ? (articleEl.getAttribute('data-style-family') || '').trim() : '';
    if (/^(ops-console|neon-signal)$/.test(family)) return 'signal';
    if (/^(archive-paper|salon-luxe|night-gallery|studio-ribbon)$/.test(family)) return 'museum';
    if (/^(field-atlas|aurora-drift)$/.test(family)) return 'atlas';
    if (/^(poster-brutal|play-lab|deck-story)$/.test(family)) return 'expressive';
    return 'editorial';
  }

  function getWeChatDirectChild(node, matcher) {
    var children = Array.from(node.children || []);
    for (var i = 0; i < children.length; i++) {
      if (matcher(children[i])) return children[i];
    }
    return null;
  }

  function hasClassToken(node, token) {
    return !!(node && node.className && new RegExp('\\b' + token + '\\b').test(node.className));
  }

  function normalizeWeChatInline(node, warnings) {
    if (!node) return '';
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeHtml(node.nodeValue);
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    var tag = node.tagName.toLowerCase();
    if (tag === 'svg') {
      warnings.push('公众号复制已忽略 SVG 图形，将使用文字结构输出。');
      return '';
    }
    if (tag === 'br') return '<br>';

    var inner = Array.from(node.childNodes).map(function (child) {
      return normalizeWeChatInline(child, warnings);
    }).join('');

    if (tag === 'strong' || tag === 'b') return '<strong>' + inner + '</strong>';
    if (tag === 'em' || tag === 'i') return '<em>' + inner + '</em>';
    if (tag === 'code') return '<code>' + inner + '</code>';
    if (tag === 'a') {
      var href = sanitizeUrl(node.getAttribute('href'));
      if (!href) return inner;
      return '<a href="' + escapeHtml(href) + '">' + inner + '</a>';
    }
    if (tag === 'img') return '';
    return inner;
  }

  function normalizeWeChatInlineList(nodeList, warnings) {
    return Array.from(nodeList || []).map(function (child) {
      return normalizeWeChatInline(child, warnings);
    }).join('').trim();
  }

  function normalizeWeChatParagraph(node, warnings) {
    var html = normalizeWeChatInlineList(node.childNodes, warnings);
    return html ? { type: 'paragraph', html: html } : null;
  }

  function normalizeWeChatListItem(node, warnings) {
    var htmlParts = [];
    var children = [];

    Array.from(node.childNodes || []).forEach(function (child) {
      if (child.nodeType === Node.ELEMENT_NODE && /^(ul|ol)$/i.test(child.tagName)) {
        var childList = normalizeWeChatList(child, warnings);
        if (childList) children.push(childList);
        return;
      }
      if (child.nodeType === Node.ELEMENT_NODE && child.tagName.toLowerCase() === 'p') {
        var paragraphHtml = normalizeWeChatInlineList(child.childNodes, warnings);
        if (paragraphHtml) htmlParts.push(paragraphHtml);
        return;
      }
      var html = normalizeWeChatInline(child, warnings).trim();
      if (html) htmlParts.push(html);
    });

    if (!htmlParts.length && !children.length) return null;
    return {
      html: htmlParts.join('<br>'),
      children: children
    };
  }

  function normalizeWeChatList(node, warnings) {
    var items = Array.from(node.children || []).map(function (child) {
      return normalizeWeChatListItem(child, warnings);
    }).filter(Boolean);
    if (!items.length) return null;
    return {
      type: 'list',
      ordered: node.tagName.toLowerCase() === 'ol',
      items: items
    };
  }

  function normalizeWeChatQuote(node, warnings) {
    var sourceEl = node.querySelector('small');
    var htmlParts = [];

    Array.from(node.childNodes || []).forEach(function (child) {
      if (child === sourceEl) return;
      if (child.nodeType === Node.ELEMENT_NODE && child.tagName.toLowerCase() === 'p') {
        var paragraphHtml = normalizeWeChatInlineList(child.childNodes, warnings);
        if (paragraphHtml) htmlParts.push(paragraphHtml);
        return;
      }
      var html = normalizeWeChatInline(child, warnings).trim();
      if (html) htmlParts.push(html);
    });

    if (!htmlParts.length) return null;
    return {
      type: 'quote',
      html: htmlParts.join('<br><br>'),
      source: sourceEl ? (sourceEl.textContent || '').trim() : ''
    };
  }

  function normalizeWeChatImage(node, warnings) {
    var img = node && node.tagName && node.tagName.toLowerCase() === 'img'
      ? node
      : (node && node.querySelector ? node.querySelector('img') : null);
    if (!img) return null;

    var src = sanitizeUrl(img.getAttribute('src'));
    if (!src) {
      warnings.push('存在无法直接复制到公众号的本地图片，已跳过。');
      return null;
    }
    if (/^blob:/i.test(src)) warnings.push('存在本地 blob 图片，粘贴到公众号后可能需要重新上传。');
    if (/^data:image\//i.test(src)) warnings.push('存在 base64 图片，公众号后台不一定完整保留。');

    var captionEl = node && node.querySelector && node.tagName && node.tagName.toLowerCase() !== 'img'
      ? node.querySelector('figcaption')
      : null;
    var widthPct = parseInt((node && node.getAttribute ? node.getAttribute('data-image-width') : '90') || '90', 10);
    if (!widthPct || Number.isNaN(widthPct)) widthPct = 90;

    return {
      type: 'image',
      src: src,
      alt: img.getAttribute('alt') || '',
      caption: captionEl ? (captionEl.textContent || '').trim() : '',
      widthPct: Math.max(60, Math.min(92, widthPct))
    };
  }

  function normalizeWeChatSubheading(node, warnings) {
    var html = normalizeWeChatInlineList(node.childNodes, warnings);
    return html ? { type: 'subheading', html: html } : null;
  }

  function normalizeWeChatTableCellHtml(cell, warnings) {
    var parts = [];
    Array.from(cell.childNodes || []).forEach(function (child) {
      if (child.nodeType === Node.ELEMENT_NODE && child.tagName.toLowerCase() === 'p') {
        var paragraphHtml = normalizeWeChatInlineList(child.childNodes, warnings);
        if (paragraphHtml) parts.push(paragraphHtml);
        return;
      }
      var html = normalizeWeChatInline(child, warnings).trim();
      if (html) parts.push(html);
    });
    return parts.join('<br><br>') || escapeHtml(cell.textContent || '');
  }

  function normalizeWeChatTable(node, warnings) {
    var rows = Array.from(node.rows || []).map(function (row) {
      var cells = Array.from(row.cells || []).map(function (cell) {
        return {
          tag: cell.tagName.toLowerCase() === 'th' ? 'th' : 'td',
          colSpan: cell.colSpan || 1,
          rowSpan: cell.rowSpan || 1,
          html: normalizeWeChatTableCellHtml(cell, warnings)
        };
      }).filter(function (cell) {
        return !!cell.html;
      });
      return cells.length ? { cells: cells } : null;
    }).filter(Boolean);

    return rows.length ? { type: 'table', rows: rows } : null;
  }

  function normalizeWeChatNote(node, warnings, forcedLabel) {
    var label = forcedLabel || '';
    var heading = getWeChatDirectChild(node, function (child) {
      return /^(h2|h3)$/i.test(child.tagName);
    });
    if (!label && heading) label = (heading.textContent || '').trim();
    if (!label && node.getAttribute) {
      label = (node.getAttribute('data-infographic-kind') || '').replace(/-/g, ' ').trim();
    }
    if (!label) label = '说明';

    var bodyNodes = Array.from(node.childNodes || []).filter(function (child) {
      if (child === heading) return false;
      if (child.nodeType === Node.ELEMENT_NODE) {
        if (child.tagName.toLowerCase() === 'svg') return false;
        if (child.getAttribute && child.getAttribute('aria-hidden') === 'true') return false;
        if (hasClassToken(child, 'tp-free-hero-art')) return false;
      }
      return true;
    });

    var body = normalizeWeChatRichContent(bodyNodes, warnings);
    if (!body.length) {
      var text = (node.textContent || '').trim();
      if (text) {
        var normalizedText = text === label ? '' : text.replace(new RegExp('^' + label + '[：:]?\\s*'), '').trim();
        if (normalizedText) {
          body.push({ type: 'paragraph', html: escapeHtml(normalizedText) });
        }
      }
    }

    if (!body.length) return null;
    return {
      type: 'note',
      label: label,
      body: body
    };
  }

  function normalizeWeChatRichContent(nodeList, warnings) {
    var blocks = [];

    Array.from(nodeList || []).forEach(function (node) {
      if (!node) return;
      if (node.nodeType === Node.TEXT_NODE) {
        var text = String(node.nodeValue || '').trim();
        if (text) blocks.push({ type: 'paragraph', html: escapeHtml(text) });
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;

      var tag = node.tagName.toLowerCase();
      if (tag === 'svg') {
        warnings.push('公众号复制已忽略 SVG 图形，将使用文字结构输出。');
        return;
      }
      if (tag === 'p') {
        pushWeChatBlocks(blocks, normalizeWeChatParagraph(node, warnings));
        return;
      }
      if (tag === 'ul' || tag === 'ol') {
        pushWeChatBlocks(blocks, normalizeWeChatList(node, warnings));
        return;
      }
      if (tag === 'blockquote' || hasClassToken(node, 'wx-quote-card') || hasClassToken(node, 'tp-free-quote')) {
        pushWeChatBlocks(blocks, normalizeWeChatQuote(node, warnings));
        return;
      }
      if (tag === 'img' || tag === 'figure' || hasClassToken(node, 'wx-media-frame')) {
        pushWeChatBlocks(blocks, normalizeWeChatImage(node, warnings));
        return;
      }
      if (tag === 'table') {
        pushWeChatBlocks(blocks, normalizeWeChatTable(node, warnings));
        return;
      }
      if (tag === 'hr' || hasClassToken(node, 'wx-divider-ornament') || hasClassToken(node, 'tp-free-divider')) {
        blocks.push({ type: 'divider' });
        return;
      }
      if (tag === 'h3') {
        pushWeChatBlocks(blocks, normalizeWeChatSubheading(node, warnings));
        return;
      }
      if (hasClassToken(node, 'wx-inline-graphic') || hasClassToken(node, 'tp-free-note')) {
        pushWeChatBlocks(blocks, normalizeWeChatNote(node, warnings));
        return;
      }
      pushWeChatBlocks(blocks, normalizeWeChatRichContent(node.childNodes, warnings));
    });

    return blocks;
  }

  function normalizeRuleHero(card) {
    var title = (card.querySelector('h1') || {}).textContent || '';
    var lead = (card.querySelector('.wx-lead') || {}).textContent || '';
    var kicker = (card.querySelector('.wx-eyebrow') || {}).textContent || '';
    var pills = Array.from(card.querySelectorAll('.wx-pill-grid > *')).map(function (pill) {
      return (pill.textContent || '').trim();
    }).filter(Boolean);
    if (!title.trim() && !lead.trim()) return null;
    return {
      type: 'hero',
      kicker: kicker.trim(),
      title: title.trim(),
      lead: lead.trim(),
      pills: pills
    };
  }

  function normalizeRuleIntro(card, warnings) {
    var bodyEl = card.querySelector('.wx-section-body') || card;
    var body = normalizeWeChatRichContent(bodyEl.childNodes, warnings);
    if (!body.length) return null;
    return {
      type: 'intro',
      label: ((card.querySelector('.wx-card-caption') || {}).textContent || '').trim(),
      body: body
    };
  }

  function normalizeRuleSection(card, warnings) {
    var heading = card.querySelector('.wx-section-heading');
    var bodyEl = card.querySelector('.wx-section-body') || card;
    var body = normalizeWeChatRichContent(bodyEl.childNodes, warnings);
    var title = heading ? ((heading.querySelector('h2') || {}).textContent || '') : '';
    var label = heading ? ((heading.querySelector('.wx-card-caption') || {}).textContent || '') : '';
    var index = heading ? ((heading.querySelector('.wx-section-index') || {}).textContent || '') : '';
    if (!title.trim() && !body.length) return null;
    return {
      type: 'section',
      index: index.trim(),
      label: label.trim(),
      title: title.trim(),
      body: body
    };
  }

  function normalizeRuleMetrics(grid) {
    var items = Array.from(grid.querySelectorAll('.wx-metric-card')).map(function (card) {
      var value = ((card.querySelector('strong') || {}).textContent || '').trim();
      var label = ((card.querySelector('span') || {}).textContent || '').trim();
      return value || label ? { value: value, label: label } : null;
    }).filter(Boolean);
    return items.length ? { type: 'metrics', items: items } : null;
  }

  function normalizeRuleCompare(grid, warnings) {
    var items = Array.from(grid.querySelectorAll('.wx-compare-card')).map(function (card) {
      var title = ((card.querySelector('h3') || {}).textContent || '').trim();
      var body = normalizeWeChatRichContent(card.childNodes, warnings).filter(function (block) {
        return block.type !== 'subheading';
      });
      return title || body.length ? { title: title, body: body } : null;
    }).filter(Boolean);
    return items.length ? { type: 'compare', items: items } : null;
  }

  function normalizeRuleTimeline(card, warnings) {
    var items = Array.from(card.querySelectorAll('.wx-timeline-item')).map(function (item) {
      var titleEl = item.querySelector('h3') || item.querySelector('strong');
      var bodyNodes = Array.from(item.childNodes || []).filter(function (child) {
        return child !== titleEl && !(child.nodeType === Node.ELEMENT_NODE && hasClassToken(child, 'wx-timeline-dot'));
      });
      var body = normalizeWeChatRichContent(bodyNodes, warnings);
      var title = ((titleEl || {}).textContent || '').trim();
      return title || body.length ? { title: title, body: body } : null;
    }).filter(Boolean);
    return items.length ? { type: 'timeline', items: items } : null;
  }

  function normalizeRuleSummary(card, warnings) {
    var body = normalizeWeChatRichContent(card.childNodes, warnings);
    return body.length ? { type: 'summary', body: body } : null;
  }

  function normalizeRuleDescriptor(descriptor, warnings) {
    var block = descriptor.element;
    if (!block) return null;
    if (descriptor.type === 'hero') return normalizeRuleHero(block, warnings);
    if (descriptor.type === 'intro') return normalizeRuleIntro(block, warnings);
    if (descriptor.type === 'section') return normalizeRuleSection(block, warnings);
    if (descriptor.type === 'metric') return normalizeRuleMetrics(block, warnings);
    if (descriptor.type === 'compare') return normalizeRuleCompare(block, warnings);
    if (descriptor.type === 'timeline') return normalizeRuleTimeline(block, warnings);
    if (descriptor.type === 'quote') return normalizeWeChatQuote(block, warnings);
    if (descriptor.type === 'summary') return normalizeRuleSummary(block, warnings);
    if (descriptor.type === 'note') return normalizeWeChatNote(block, warnings);
    if (descriptor.type === 'image') return normalizeWeChatImage(block, warnings);
    if (descriptor.type === 'divider') return { type: 'divider' };
    return normalizeWeChatRichContent(block.childNodes, warnings);
  }

  function collectRuleWeChatBlocks(shell, warnings) {
    var blocks = [];
    collectWeChatSemanticBlocks(shell).forEach(function (descriptor) {
      pushWeChatBlocks(blocks, normalizeRuleDescriptor(descriptor, warnings));
    });
    return blocks;
  }

  function normalizeFreeHero(section) {
    var titleEl = section.querySelector('h1');
    if (!titleEl) return null;
    var kickerEl = section.querySelector('.tp-free-kicker');
    var leadEl = getWeChatDirectChild(section, function (child) {
      return child.tagName && child.tagName.toLowerCase() === 'p';
    }) || titleEl.parentNode.querySelector('p');
    return {
      type: 'hero',
      kicker: ((kickerEl || {}).textContent || '').trim(),
      title: (titleEl.textContent || '').trim(),
      lead: ((leadEl || {}).textContent || '').trim(),
      pills: []
    };
  }

  function normalizeFreeSection(section, warnings) {
    var titleEl = getWeChatDirectChild(section, function (child) {
      return /^(h2|h3)$/i.test(child.tagName);
    });
    var bodyNodes = Array.from(section.childNodes || []).filter(function (child) {
      if (child === titleEl) return false;
      if (child.nodeType === Node.ELEMENT_NODE) {
        if (child.tagName.toLowerCase() === 'svg') return false;
        if (child.getAttribute && child.getAttribute('aria-hidden') === 'true') return false;
        if (hasClassToken(child, 'tp-free-hero-art')) return false;
      }
      return true;
    });
    var body = normalizeWeChatRichContent(bodyNodes, warnings);
    if (!titleEl && !body.length) return null;
    return {
      type: 'section',
      index: '',
      label: '',
      title: titleEl ? (titleEl.textContent || '').trim() : '',
      body: body
    };
  }

  function collectFreeWeChatBlocks(shell, warnings) {
    var blocks = [];

    Array.from(shell.children || []).forEach(function (child) {
      if (child.nodeType !== Node.ELEMENT_NODE) return;
      if (hasClassToken(child, 'tp-free-hero') || child.querySelector('h1')) {
        pushWeChatBlocks(blocks, normalizeFreeHero(child, warnings));
        return;
      }
      if (hasClassToken(child, 'tp-free-note')) {
        pushWeChatBlocks(blocks, normalizeWeChatNote(child, warnings));
        return;
      }
      if (hasClassToken(child, 'tp-free-panel')) {
        pushWeChatBlocks(blocks, normalizeFreeSection(child, warnings));
        return;
      }
      if (hasClassToken(child, 'tp-free-divider') || child.tagName.toLowerCase() === 'hr') {
        blocks.push({ type: 'divider' });
        return;
      }
      if (child.tagName.toLowerCase() === 'blockquote' || hasClassToken(child, 'tp-free-quote')) {
        pushWeChatBlocks(blocks, normalizeWeChatQuote(child, warnings));
        return;
      }
      if (child.tagName.toLowerCase() === 'figure' || child.tagName.toLowerCase() === 'img') {
        pushWeChatBlocks(blocks, normalizeWeChatImage(child, warnings));
        return;
      }
      pushWeChatBlocks(blocks, normalizeWeChatRichContent(child.childNodes, warnings));
    });

    if (!blocks.some(function (block) { return block.type === 'hero'; })) {
      var fallbackHero = shell.querySelector('h1');
      if (fallbackHero) {
        var fallbackSection = fallbackHero.closest('section') || fallbackHero.parentNode;
        pushWeChatBlocks(blocks, normalizeFreeHero(fallbackSection, warnings));
      }
    }

    return blocks;
  }

  function getWeChatBrandBanner(warnings) {
    var banner = editorEl ? editorEl.querySelector('.phone-brand-banner') : null;
    if (!banner) return null;

    var overline = ((banner.querySelector('.phone-brand-overline') || {}).textContent || '').trim();
    var title = ((banner.querySelector('.phone-brand-copy strong') || {}).textContent || '').trim();
    var subtitle = ((banner.querySelector('.phone-brand-copy small') || {}).textContent || '').trim();
    var chip = ((banner.querySelector('.phone-brand-chip') || {}).textContent || '').trim();
    var img = banner.querySelector('.phone-brand-mark img');
    var logoSrc = '';

    if (img) {
      logoSrc = sanitizeUrl(img.getAttribute('src'));
      if (/^blob:/i.test(logoSrc)) warnings.push('品牌 logo 使用了本地 blob 地址，粘贴到公众号后可能需要重新上传。');
      if (/^data:image\//i.test(logoSrc)) warnings.push('品牌 logo 使用了 base64 地址，公众号后台不一定完整保留。');
      if (!/^(https?:|data:image\/)/i.test(logoSrc)) logoSrc = '';
    }

    if (!overline && !title && !subtitle && !chip && !logoSrc) return null;
    return {
      overline: overline,
      title: title,
      subtitle: subtitle,
      chip: chip,
      logoSrc: logoSrc
    };
  }

  function isRenderableWeChatBlock(block) {
    if (!block) return false;
    if (block.type === 'divider') return false;
    if (block.type === 'hero') return !!(block.title || block.lead);
    if (block.type === 'image') return !!block.src;
    if (block.type === 'metrics') return !!(block.items && block.items.length);
    if (block.type === 'compare') return !!(block.items && block.items.length);
    if (block.type === 'timeline') return !!(block.items && block.items.length);
    if (block.type === 'intro' || block.type === 'section' || block.type === 'summary' || block.type === 'note') {
      return !!(block.title || block.label || (block.body && block.body.some(isRenderableWeChatBlock)));
    }
    if (block.type === 'list') return !!(block.items && block.items.length);
    if (block.type === 'table') return !!(block.rows && block.rows.length);
    return !!(block.html || block.source);
  }

  function buildWeChatDoc() {
    var articleEl = getWeChatArticleEl();
    if (!articleEl) {
      throw new Error('未找到文章主体');
    }

    var warnings = [];
    var uiMode = getWeChatUiMode(articleEl);
    var contentTemplate = getWeChatContentTemplate(articleEl);
    var shell = getWeChatShell(articleEl);
    var blocks = uiMode === 'free'
      ? collectFreeWeChatBlocks(shell, warnings)
      : collectRuleWeChatBlocks(shell, warnings);

    if (uiMode === 'free') {
      warnings.push('free 页面已按 generic knowledge 模板降级输出。');
      contentTemplate = 'knowledge-article';
    }

    if (!blocks.some(isRenderableWeChatBlock)) {
      if (uiMode === 'free') {
        throw new Error('free 页面请先转 rule 或导出图片。');
      }
      throw new Error('未识别到可复制的公众号内容。');
    }

    return {
      mode: 'wechat-native',
      uiMode: uiMode,
      contentTemplate: contentTemplate,
      docType: getWeChatDocType(contentTemplate),
      templatePackId: getWeChatTemplatePackId(contentTemplate),
      headingSystem: getWeChatHeadingSystem(articleEl),
      styleFamily: getWeChatStyleFamily(articleEl),
      familyBridgeId: getWeChatFamilyBridgeId(articleEl),
      paletteBridge: getWeChatPaletteBridge(articleEl),
      familyHint: getWeChatFamilyHint(articleEl),
      brandBanner: getWeChatBrandBanner(warnings),
      blocks: blocks,
      warnings: uniqueWarnings(warnings)
    };
  }

  function getWeChatTemplatePackRegistry() {
    var baseTokenSet = {
      fontFamily: '-apple-system,BlinkMacSystemFont,"Helvetica Neue","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif',
      paper: '#FFFFFF',
      title: '#000000',
      textMain: '#333333',
      textMuted: '#666666',
      border: '#E5E7EB',
      divider: '#E5E7EB',
      cardBg: '#F7F9FC',
      cardAltBg: '#F5F6F7',
      accent: '#1677FF',
      accentSoft: '#EEF5FF',
      accentStrong: '#125FD1',
      quoteBg: '#F7F8FA',
      radius: '8px'
    };

    return {
      'knowledge-editorial': {
        id: 'knowledge-editorial',
        tokenSet: mergeStyleMaps(baseTokenSet, {
          accent: '#1677FF',
          accentSoft: '#EEF5FF',
          accentStrong: '#125FD1',
          cardBg: '#F7F9FC',
          cardAltBg: '#F5F6F7',
          border: '#E4E8EF',
          divider: '#E4E8EF'
        }),
        layout: {
          heroAlign: 'center',
          heroTitleSize: '26px',
          heroLeadSize: '15px',
          heroRuleMargin: '14px auto 0',
          introCard: false,
          sectionCard: false,
          summaryCard: false,
          noteCard: false
        }
      },
      'weekly-briefing': {
        id: 'weekly-briefing',
        tokenSet: mergeStyleMaps(baseTokenSet, {
          accent: '#1677FF',
          accentSoft: '#EEF5FF',
          accentStrong: '#125FD1',
          cardBg: '#F6F8FB',
          cardAltBg: '#F4F6F8',
          border: '#E0E5EC',
          divider: '#E0E5EC'
        }),
        layout: {
          heroAlign: 'left',
          heroTitleSize: '25px',
          heroLeadSize: '15px',
          heroRuleMargin: '14px 0 0',
          introCard: false,
          sectionCard: false,
          summaryCard: false,
          noteCard: false
        }
      },
      'brand-feature': {
        id: 'brand-feature',
        tokenSet: mergeStyleMaps(baseTokenSet, {
          accent: '#9A6132',
          accentSoft: '#FBF2E7',
          accentStrong: '#7A4920',
          title: '#201A16',
          textMain: '#342C26',
          textMuted: '#6F655E',
          cardBg: '#FFF9F3',
          cardAltBg: '#FBF5EF',
          border: '#E5D3C1',
          divider: '#E0CDBB',
          quoteBg: '#FBF5EF'
        }),
        layout: {
          heroAlign: 'left',
          heroTitleSize: '27px',
          heroLeadSize: '15px',
          heroRuleMargin: '14px 0 0',
          introCard: false,
          sectionCard: false,
          summaryCard: false,
          noteCard: false
        }
      }
    };
  }

  function getWeChatFamilyBridgeRegistry() {
    return {
      editorial: {
        id: 'editorial',
        tokenSet: {
          radius: '8px'
        },
        layout: {
          labelMode: 'underline',
          dividerWidth: '80%',
          titleMarker: 'none',
          heroVariant: 'editorial',
          sectionVariant: 'editorial',
          summaryVariant: 'editorial'
        }
      },
      archive: {
        id: 'archive',
        tokenSet: {
          radius: '10px'
        },
        layout: {
          labelMode: 'plaque',
          dividerWidth: '72%',
          sectionCard: false,
          titleMarker: 'none',
          heroVariant: 'archive',
          sectionVariant: 'archive',
          summaryVariant: 'archive'
        }
      },
      atlas: {
        id: 'atlas',
        tokenSet: {
          radius: '10px'
        },
        layout: {
          labelMode: 'atlas',
          dividerWidth: '74%',
          titleMarker: 'line',
          heroVariant: 'atlas',
          sectionVariant: 'atlas',
          summaryVariant: 'atlas'
        }
      },
      signal: {
        id: 'signal',
        tokenSet: {
          radius: '6px'
        },
        layout: {
          labelMode: 'signal',
          dividerWidth: '100%',
          sectionCard: false,
          introCard: false,
          titleMarker: 'bar',
          heroVariant: 'signal',
          sectionVariant: 'signal',
          summaryVariant: 'signal'
        }
      },
      ribbon: {
        id: 'ribbon',
        tokenSet: {
          radius: '12px'
        },
        layout: {
          labelMode: 'ribbon',
          dividerWidth: '76%',
          sectionCard: false,
          titleMarker: 'none',
          heroVariant: 'ribbon',
          sectionVariant: 'ribbon',
          summaryVariant: 'ribbon'
        }
      },
      aurora: {
        id: 'aurora',
        tokenSet: {
          radius: '12px'
        },
        layout: {
          labelMode: 'mist',
          dividerWidth: '74%',
          titleMarker: 'soft-bar',
          heroVariant: 'aurora',
          sectionVariant: 'aurora',
          summaryVariant: 'aurora'
        }
      },
      poster: {
        id: 'poster',
        tokenSet: {
          radius: '8px'
        },
        layout: {
          labelMode: 'block',
          dividerWidth: '86%',
          titleMarker: 'bar',
          heroVariant: 'poster',
          sectionVariant: 'poster',
          summaryVariant: 'poster'
        }
      }
    };
  }

  function resolveWeChatTemplatePack(doc) {
    var registry = getWeChatTemplatePackRegistry();
    var bridgeRegistry = getWeChatFamilyBridgeRegistry();
    var rawPack = registry[doc.templatePackId] || registry['knowledge-editorial'];
    var bridge = bridgeRegistry[doc.familyBridgeId] || bridgeRegistry.editorial;
    var paletteBridge = doc.paletteBridge || {};
    return {
      id: rawPack.id,
      bridgeId: bridge.id,
      tokenSet: mergeStyleMaps({}, rawPack.tokenSet, paletteBridge, bridge.tokenSet || {}),
      layout: mergeStyleMaps({}, rawPack.layout, bridge.layout || {}, {
        bridgeId: bridge.id,
        headingSystem: doc.headingSystem || 'index-led'
      })
    };
  }

  function sanitizeWeChatInlineHtml(html) {
    var container = document.createElement('div');
    container.innerHTML = String(html || '');

    function walk(node) {
      if (!node) return '';
      if (node.nodeType === 3) return escapeHtml(node.nodeValue || '');
      if (node.nodeType !== 1) return '';

      var tag = (node.tagName || '').toLowerCase();
      if (tag === 'br') return '<br>';
      if (tag === 'script' || tag === 'style' || tag === 'svg' || tag === 'iframe' || tag === 'object') {
        return '';
      }

      var children = Array.prototype.map.call(node.childNodes || [], walk).join('');

      if (tag === 'strong' || tag === 'b') return '<strong>' + children + '</strong>';
      if (tag === 'em' || tag === 'i') return '<em>' + children + '</em>';
      if (tag === 'code') return '<code>' + children + '</code>';
      if (tag === 'a') {
        var href = sanitizeUrl(node.getAttribute('href'));
        if (/^(https?:|mailto:|tel:)/i.test(href)) {
          return '<a href="' + escapeHtml(href) + '">' + (children || escapeHtml(href)) + '</a>';
        }
        return children;
      }

      return children;
    }

    return Array.prototype.map.call(container.childNodes || [], walk).join('');
  }

  function renderWeChatInlineHtml(html, tokens) {
    return sanitizeWeChatInlineHtml(html)
      .replace(/<strong>/g, '<strong style="' + styleToString({
        color: tokens.accentStrong,
        'font-weight': '700'
      }) + '">')
      .replace(/<em>/g, '<em style="' + styleToString({
        'font-style': 'italic'
      }) + '">')
      .replace(/<code>/g, '<code style="' + styleToString({
        padding: '1px 4px',
        color: tokens.accentStrong,
        'background-color': tokens.accentSoft,
        'border-radius': '4px',
        'font-size': '0.92em',
        'font-family': 'Menlo,Monaco,Consolas,monospace'
      }) + '">')
      .replace(/<a href="([^"]+)">/g, function (_match, href) {
        return '<a href="' + href + '" style="' + styleToString({
          color: tokens.accent,
          'font-weight': '700',
          'text-decoration': 'underline'
        }) + '">';
      });
  }

  function renderWeChatSurfaceCard(innerHtml, tokens, options) {
    var opts = options || {};
    var bgColor = opts.bgColor || tokens.cardBg;
    var borderColor = opts.borderColor || tokens.border;
    return renderWeChatTable(innerHtml, {
      padding: opts.padding || '16px 18px',
      'background-color': bgColor,
      border: '1px solid ' + borderColor,
      'border-radius': opts.radius || tokens.radius
    }, bgColor, {
      margin: opts.margin || '0 0 20px',
      padding: '0'
    });
  }

  function renderWeChatDivider(pack, overrides) {
    var tokens = pack.tokenSet;
    var layout = pack.layout || {};
    return '<hr style="' + styleToString(mergeStyleMaps({
      border: '0',
      'border-top': (layout.bridgeId === 'poster' ? '2px' : '1px') + ' solid ' + tokens.divider,
      width: layout.dividerWidth || '80%',
      margin: '15px auto'
    }, overrides || {})) + '">';
  }

  function renderWeChatLabel(text, pack, options) {
    var value = (text || '').trim();
    if (!value) return '';
    var tokens = pack.tokenSet;
    var opts = options || {};
    var align = opts.align || 'left';
    var mode = opts.mode || pack.layout.labelMode || 'underline';
    var style = {
      margin: opts.margin || '0 0 12px',
      color: tokens.accentStrong,
      'font-size': '11px',
      'line-height': '1.4',
      'font-weight': '700',
      'letter-spacing': '0.16em',
      'text-align': align
    };
    if (mode === 'plaque') {
      style.display = 'inline-block';
      style.padding = '0 0 6px';
      style['border-bottom'] = '1px solid ' + tokens.border;
      style['letter-spacing'] = '0.1em';
      style['text-transform'] = 'uppercase';
    } else if (mode === 'ribbon') {
      style.display = 'inline-block';
      style.padding = '0 0 0 10px';
      style['border-left'] = '3px solid ' + tokens.accent;
      style['letter-spacing'] = '0.1em';
      style['text-transform'] = 'uppercase';
    } else if (mode === 'mist') {
      style.display = 'inline-block';
      style.padding = '0 0 6px';
      style['border-bottom'] = '1px solid ' + tokens.accentSoft;
      style['letter-spacing'] = '0.1em';
      style['text-transform'] = 'uppercase';
    } else if (mode === 'atlas') {
      style.display = 'inline-block';
      style.padding = '0 0 0 10px';
      style['border-left'] = '2px solid ' + tokens.accent;
      style['letter-spacing'] = '0.1em';
      style['text-transform'] = 'uppercase';
    } else if (mode === 'signal') {
      style.display = 'inline-block';
      style.padding = '0 0 0 10px';
      style['border-left'] = '2px solid ' + tokens.accent;
      style['letter-spacing'] = '0.12em';
      style['text-transform'] = 'uppercase';
    } else if (mode === 'block') {
      style.display = 'inline-block';
      style.padding = '0 0 6px';
      style['border-bottom'] = '2px solid ' + tokens.accent;
      style['letter-spacing'] = '0.08em';
      style['text-transform'] = 'uppercase';
    } else if (align === 'left') {
      style.display = 'inline-block';
      style['padding-bottom'] = '4px';
      style['border-bottom'] = '1px solid ' + tokens.border;
      style['text-transform'] = 'uppercase';
    }
    return '<p style="' + styleToString(style) + '">' + escapeHtml(value) + '</p>';
  }

  function renderWeChatMetaToken(text, pack, kind) {
    var value = (text || '').trim();
    if (!value) return '';
    var tokens = pack.tokenSet;
    var isIndex = kind === 'index';
    return '<span style="' + styleToString({
      display: 'inline-block',
      margin: isIndex ? '0 8px 8px 0' : '0 0 8px 0',
      padding: isIndex ? '0 10px 0 0' : '0',
      color: tokens.accentStrong,
      'border-right': isIndex ? '1px solid ' + tokens.border : '0',
      'font-size': isIndex ? '17px' : '11px',
      'line-height': '1.4',
      'font-weight': '700',
      'letter-spacing': isIndex ? '0.02em' : '0.14em',
      'text-transform': 'uppercase'
    }) + '">' + escapeHtml(value) + '</span>';
  }

  function renderWeChatParagraph(block, pack, overrides) {
    var tokens = pack.tokenSet;
    return '<p style="' + styleToString(mergeStyleMaps({
      margin: '0 0 10px',
      color: tokens.textMain,
      'font-size': '15px',
      'line-height': '1.72',
      'text-align': 'justify',
      'text-indent': '2em',
      'word-break': 'break-word'
    }, overrides || {})) + '">' + renderWeChatInlineHtml(block.html, tokens) + '</p>';
  }

  function renderWeChatList(block, pack) {
    var tokens = pack.tokenSet;
    var tag = block.ordered ? 'ol' : 'ul';
    var items = block.items.map(function (item) {
      var html = item.html ? '<span>' + renderWeChatInlineHtml(item.html, tokens) + '</span>' : '';
      var children = (item.children || []).map(function (childList) {
        return renderWeChatList(childList, pack);
      }).join('');
      return '<li style="' + styleToString({
        margin: '0 0 8px',
        color: tokens.textMain,
        'font-size': '16px',
        'line-height': '1.75',
        'text-align': 'justify'
      }) + '">' + html + children + '</li>';
    }).join('');

    return '<' + tag + ' style="' + styleToString({
      margin: '0 0 12px',
      padding: '0 0 0 1.4em',
      color: tokens.textMain,
      'font-size': '16px',
      'line-height': '1.75'
    }) + '">' + items + '</' + tag + '>';
  }

  function renderWeChatTableBlock(block, pack) {
    var tokens = pack.tokenSet;
    var rows = block.rows.map(function (row) {
      var cells = row.cells.map(function (cell) {
        var attrs = '';
        if (cell.colSpan > 1) attrs += ' colspan="' + escapeHtml(String(cell.colSpan)) + '"';
        if (cell.rowSpan > 1) attrs += ' rowspan="' + escapeHtml(String(cell.rowSpan)) + '"';
        return '<' + cell.tag + attrs + ' style="' + styleToString({
          border: '1px solid ' + tokens.border,
          padding: '10px 12px',
          'background-color': 'transparent',
          color: tokens.textMain,
          'font-size': '14px',
          'line-height': '1.7',
          'font-weight': cell.tag === 'th' ? '700' : '400',
          'text-align': 'left',
          'vertical-align': 'top'
        }) + '">' + renderWeChatInlineHtml(cell.html, tokens) + '</' + cell.tag + '>';
      }).join('');
      return '<tr>' + cells + '</tr>';
    }).join('');

    return '<section style="margin:0 0 16px;padding:0;overflow-x:auto;">' +
      '<table cellpadding="0" cellspacing="0" border="0" width="100%" style="' + styleToString({
        width: '100%',
        'border-collapse': 'collapse',
        'border-spacing': '0'
      }) + '">' + rows + '</table>' +
    '</section>';
  }

  function renderWeChatImage(block, pack) {
    var tokens = pack.tokenSet;
    var imageRadius = pack.layout.bridgeId === 'signal'
      ? '6px'
      : (pack.layout.bridgeId === 'ribbon' || pack.layout.bridgeId === 'aurora' || pack.layout.bridgeId === 'archive'
        ? '10px'
        : '4px');
    return '<section style="margin:0 0 18px;padding:0;text-align:center;">' +
      '<img src="' + escapeHtml(block.src) + '" alt="' + escapeHtml(block.alt || '') + '" style="' + styleToString({
        display: 'block',
        width: (block.widthPct || 90) + '%',
        'max-width': (block.widthPct || 90) + '%',
        height: 'auto',
        margin: '0 auto',
        border: '1px solid ' + tokens.border,
        'border-radius': imageRadius
      }) + '">' +
      (block.caption ? '<p style="' + styleToString({
        margin: '8px 0 0',
        color: tokens.textMuted,
        'font-size': '14px',
        'line-height': '1.65',
        'text-align': 'center',
        'font-style': 'italic',
        'text-indent': '0'
      }) + '">' + escapeHtml(block.caption) + '</p>' : '') +
    '</section>';
  }

  function renderWeChatBodyBlocks(blocks, renderBodyBlock) {
    return (blocks || []).map(function (block) {
      return renderBodyBlock(block);
    }).join('');
  }

  function createWeChatBlockRenderer(pack) {
    var tokens = pack.tokenSet;
    var layout = pack.layout;
    var bridgeId = layout.bridgeId || 'editorial';

    function renderHeroRule(align, width, color, margin) {
      return '<div style="' + styleToString({
        width: width || '72px',
        height: bridgeId === 'poster' ? '2px' : '1px',
        margin: margin || (align === 'center' ? '14px auto 0' : '14px 0 0'),
        'background-color': color || tokens.divider
      }) + '"></div>';
    }

    function getHeroTitleStyle(align) {
      var style = {
        margin: '0 0 14px',
        color: tokens.title,
        'font-size': layout.heroTitleSize || '28px',
        'line-height': bridgeId === 'archive' || bridgeId === 'ribbon' ? '1.22' : '1.24',
        'font-weight': '700',
        'letter-spacing': '-0.045em',
        'text-align': align
      };
      if (bridgeId === 'signal') {
        style['padding-left'] = '12px';
        style['border-left'] = '3px solid ' + tokens.accent;
      } else if (bridgeId === 'aurora') {
        style['padding-bottom'] = '4px';
      } else if (bridgeId === 'archive' || bridgeId === 'ribbon') {
        style['letter-spacing'] = '-0.05em';
      }
      return style;
    }

    function getSectionTitleStyle() {
      var style = {
        margin: '0 0 12px',
        color: tokens.title,
        'font-size': bridgeId === 'archive' || bridgeId === 'ribbon' || bridgeId === 'aurora' ? '19px' : '17px',
        'line-height': bridgeId === 'archive' || bridgeId === 'ribbon' ? '1.3' : '1.32',
        'font-weight': '700',
        'letter-spacing': bridgeId === 'archive' || bridgeId === 'ribbon' ? '-0.035em' : '-0.025em',
        'text-align': 'left'
      };
      if (bridgeId === 'editorial') {
        style['padding-top'] = '8px';
        style['border-top'] = '1px solid ' + tokens.divider;
      } else if (bridgeId === 'archive' || bridgeId === 'ribbon') {
        style['padding-top'] = '8px';
        style['border-top'] = '1px solid ' + tokens.border;
      } else if (bridgeId === 'atlas') {
        style['padding-left'] = '10px';
        style['border-left'] = '2px solid ' + tokens.accent;
      } else if (bridgeId === 'signal') {
        style['padding-left'] = '10px';
        style['border-left'] = '2px solid ' + tokens.accent;
      } else if (bridgeId === 'aurora') {
        style['padding-top'] = '8px';
        style['border-top'] = '1px solid ' + tokens.accentSoft;
      } else if (bridgeId === 'poster') {
        style['padding-left'] = '10px';
        style['border-left'] = '2px solid ' + tokens.accent;
      } else if (layout.titleMarker === 'bar') {
        style['padding-left'] = '10px';
        style['border-left'] = '2px solid ' + tokens.accent;
      } else if (layout.titleMarker === 'soft-bar' || layout.titleMarker === 'line') {
        style['padding-left'] = '10px';
        style['border-left'] = '2px solid ' + (layout.titleMarker === 'soft-bar' ? tokens.accentSoft : tokens.accent);
      }
      return style;
    }

    function renderSummaryBody(blocks) {
      return (blocks || []).map(function (item) {
        if (!item) return '';
        if (item.type === 'paragraph') {
          return renderWeChatParagraph(item, pack, {
            margin: '0',
            'text-indent': '0',
            color: tokens.textMuted,
            'font-size': '15px',
            'line-height': '1.78',
            'text-align': 'left'
          });
        }
        return renderBodyBlock(item);
      }).join('');
    }

    function renderSectionMeta(block) {
      var headingSystem = layout.headingSystem || 'index-led';
      if (headingSystem === 'dual') {
        var dualBits = [];
        if (block.index) dualBits.push(renderWeChatMetaToken(block.index, pack, 'index'));
        if (block.label) dualBits.push(renderWeChatMetaToken(block.label, pack, 'label'));
        return dualBits.length ? '<p style="margin:0 0 10px;text-indent:0;text-align:left;">' + dualBits.join('') + '</p>' : '';
      }
      if (headingSystem === 'icon-led') {
        if (block.label) {
          return '<p style="' + styleToString({
            margin: '0 0 10px',
            color: tokens.accentStrong,
            'font-size': '12px',
            'line-height': '1.4',
            'font-weight': '700',
            'letter-spacing': '0.1em',
            'text-transform': 'uppercase',
            'text-indent': '0'
          }) + '"><span style="' + styleToString({
            display: 'inline-block',
            width: '8px',
            height: '8px',
            'border-radius': '999px',
            'background-color': tokens.accent,
            'margin-right': '8px',
            'vertical-align': 'middle'
          }) + '"></span>' + escapeHtml(block.label) + '</p>';
        }
        return block.index ? renderWeChatLabel(block.index, pack, { margin: '0 0 10px' }) : '';
      }
      if (headingSystem === 'plaque') {
        return renderWeChatLabel(block.label || block.index, pack, { margin: '0 0 10px' });
      }
      if (block.index && block.label) {
        return '<p style="margin:0 0 10px;text-indent:0;text-align:left;">' +
          renderWeChatMetaToken(block.index, pack, 'index') +
          renderWeChatMetaToken(block.label, pack, 'label') +
        '</p>';
      }
      return renderWeChatLabel(block.label || block.index, pack, { margin: '0 0 10px' });
    }

    function renderBodyBlock(block) {
      if (!block) return '';
      if (block.type === 'paragraph') return renderWeChatParagraph(block, pack);
      if (block.type === 'subheading') {
        return '<h3 style="' + styleToString({
          margin: '14px 0 10px',
          color: tokens.title,
          'font-size': '15px',
          'line-height': '1.4',
          'font-weight': '700',
          'letter-spacing': '-0.015em',
          'padding-bottom': '4px',
          'border-bottom': '1px solid ' + (bridgeId === 'aurora' ? tokens.accentSoft : tokens.border),
          'padding-left': bridgeId === 'signal' || bridgeId === 'poster' ? '8px' : '0',
          'border-left': bridgeId === 'signal' || bridgeId === 'poster' ? '2px solid ' + tokens.accent : '0'
        }) + '">' + renderWeChatInlineHtml(block.html, tokens) + '</h3>';
      }
      if (block.type === 'list') return renderWeChatList(block, pack);
      if (block.type === 'image') return renderWeChatImage(block, pack);
      if (block.type === 'quote') return renderQuote(block);
      if (block.type === 'table') return renderWeChatTableBlock(block, pack);
      if (block.type === 'note') return renderNote(block);
      if (block.type === 'divider') return renderWeChatDivider(pack);
      if (block.type === 'summary') return renderSummary(block);
      if (block.type === 'section') return renderSection(block);
      if (block.type === 'intro') return renderIntro(block);
      return '';
    }

    function renderHero(block) {
      var align = layout.heroAlign || 'center';
      var html = '';
      if (block.kicker) {
        html += renderWeChatLabel(block.kicker, pack, {
          align: align,
          margin: '0 0 14px'
        });
      }
      if (block.title) {
        html += '<h1 style="' + styleToString(getHeroTitleStyle(align)) + '">' + escapeHtml(block.title) + '</h1>';
      }
      if (block.lead) {
        html += '<p style="' + styleToString({
          margin: '0',
          color: tokens.textMuted,
          'font-size': layout.heroLeadSize || '16px',
          'line-height': '1.72',
          'text-align': align,
          'text-indent': '0'
        }) + '">' + escapeHtml(block.lead) + '</p>';
      }
      if (block.pills && block.pills.length) {
        html += '<p style="' + styleToString({
          margin: '16px 0 0',
          'text-align': align,
          'text-indent': '0'
        }) + '">' + block.pills.map(function (pill) {
          return '<span style="' + styleToString({
            display: 'inline-block',
            margin: align === 'center' ? '0 4px 8px' : '0 8px 8px 0',
            padding: '0 0 4px',
            color: tokens.accentStrong,
            'border-bottom': '1px solid ' + tokens.border,
            'font-size': '12px',
            'line-height': '1.4'
          }) + '">' + escapeHtml(pill) + '</span>';
        }).join('') + '</p>';
      }
      html += renderHeroRule(align, bridgeId === 'archive' ? '86px' : '72px', bridgeId === 'aurora' ? tokens.accentSoft : tokens.divider, layout.heroRuleMargin || (align === 'center' ? '14px auto 0' : '14px 0 0'));
      return '<section style="' + styleToString({
        margin: '0 0 24px',
        padding: '0 0 18px',
        'border-bottom': '1px solid ' + (bridgeId === 'aurora' ? tokens.accentSoft : tokens.border)
      }) + '">' + html + '</section>';
    }

    function renderIntro(block) {
      var inner = '';
      if (block.label) inner += renderWeChatLabel(block.label, pack, { margin: '0 0 10px' });
      inner += renderWeChatBodyBlocks(block.body, renderBodyBlock);
      if (!layout.introCard) return '<section style="margin:0 0 20px;padding:0;">' + inner + '</section>';
      return renderWeChatSurfaceCard(inner, tokens, {
        bgColor: tokens.cardBg
      });
    }

    function renderSection(block) {
      var inner = '';
      inner += renderSectionMeta(block);
      if (block.title) {
        inner += '<h2 style="' + styleToString(getSectionTitleStyle()) + '">' + escapeHtml(block.title) + '</h2>';
      }
      inner += renderWeChatBodyBlocks(block.body, renderBodyBlock);
      if (!layout.sectionCard) return '<section style="margin:0 0 24px;padding:0;">' + inner + '</section>';
      return renderWeChatSurfaceCard(inner, tokens, {
        bgColor: tokens.paper,
        borderColor: tokens.border
      });
    }

    function renderQuote(block) {
      return '<section style="margin:0 0 18px;padding:0;">' +
        '<section style="' + styleToString({
          padding: '8px 0 8px 12px',
          'border-left': '2px solid ' + tokens.accent,
          border: '0',
          'border-radius': '0'
        }) + '">' +
          '<p style="' + styleToString({
            margin: block.source ? '0 0 8px' : '0',
            color: tokens.textMuted,
            'font-size': '15px',
            'line-height': '1.75',
            'text-align': 'justify',
            'text-indent': '0'
          }) + '">' + renderWeChatInlineHtml(block.html, tokens) + '</p>' +
          (block.source ? '<p style="' + styleToString({
            margin: '0',
            color: tokens.textMuted,
            'font-size': '13px',
            'line-height': '1.6',
            'text-align': 'left',
            'text-indent': '0'
          }) + '">' + escapeHtml(block.source) + '</p>' : '') +
        '</section>' +
      '</section>';
    }

    function renderNote(block) {
      var inner = renderWeChatLabel(block.label || '说明', pack, { margin: '0 0 10px' }) +
        renderWeChatBodyBlocks(block.body, renderBodyBlock);
      if (!layout.noteCard) {
        return '<section style="' + styleToString({
          margin: '0 0 18px',
          padding: '14px 0 0',
          'border-top': '1px solid ' + tokens.divider
        }) + '">' + inner + '</section>';
      }
      return renderWeChatSurfaceCard(inner, tokens, {
        bgColor: tokens.cardAltBg
      });
    }

    function renderSummary(block) {
      var label = pack.id === 'brand-feature' ? '结语' : (pack.id === 'weekly-briefing' ? '收束' : '总结');
      var inner = renderWeChatLabel(label, pack, { margin: '0 0 10px' }) + renderSummaryBody(block.body);
      if (!layout.summaryCard) {
        return '<section style="' + styleToString({
          margin: '2px 0 18px',
          padding: '16px 0 0',
          'border-top': '1px solid ' + tokens.divider
        }) + '">' + inner + '</section>';
      }
      return renderWeChatSurfaceCard(inner, tokens, {
        bgColor: tokens.cardAltBg
      });
    }

    function renderMetrics(block) {
      var rows = [];
      for (var i = 0; i < block.items.length; i += 2) {
        var row = [block.items[i], block.items[i + 1] || null].map(function (item) {
          if (!item) return '<td width="50%" style="width:50%;padding:0 0 12px;"></td>';
          return '<td width="50%" valign="top" style="width:50%;vertical-align:top;padding:0 6px 12px 0;">' +
            '<table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:separate;border-spacing:0;">' +
              '<tr><td style="' + styleToString({
                padding: '12px 0 0',
                border: '0',
                'border-top': '1px solid ' + tokens.border,
                'border-radius': '0'
              }) + '">' +
                '<p style="' + styleToString({
                  margin: '0 0 6px',
                  color: tokens.accentStrong,
                  'font-size': '22px',
                  'line-height': '1.2',
                  'font-weight': '700',
                  'text-align': 'center',
                  'text-indent': '0'
                }) + '">' + escapeHtml(item.value || '') + '</p>' +
                '<p style="' + styleToString({
                  margin: '0',
                  color: tokens.textMain,
                  'font-size': '15px',
                  'line-height': '1.65',
                  'text-align': 'center',
                  'text-indent': '0'
                }) + '">' + escapeHtml(item.label || '') + '</p>' +
              '</td></tr>' +
            '</table>' +
          '</td>';
        }).join('');
        rows.push('<tr>' + row + '</tr>');
      }
      return '<section style="margin:0 0 18px;padding:0;">' +
        '<table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;border-spacing:0;">' + rows.join('') + '</table>' +
      '</section>';
    }

    function renderCompare(block) {
      return block.items.map(function (item) {
        var inner = renderWeChatLabel(item.title || '对比', pack, { margin: '0 0 10px' }) +
          renderWeChatBodyBlocks(item.body, renderBodyBlock);
        return '<section style="' + styleToString({
          margin: '0 0 18px',
          padding: '12px 0 0',
          'border-top': '1px solid ' + tokens.border
        }) + '">' + inner + '</section>';
      }).join('');
    }

    function renderTimeline(block) {
      var rows = block.items.map(function (item, index) {
        return '<tr>' +
          '<td width="24" valign="top" align="center" style="width:24px;vertical-align:top;padding:4px 12px 16px 0;">' +
            '<span style="' + styleToString({
              display: 'inline-block',
              width: '10px',
              height: '10px',
              'border-radius': '999px',
              'background-color': tokens.accent,
              'font-size': '0',
              'line-height': '0'
            }) + '">&nbsp;</span>' +
            (index < block.items.length - 1 ? '<p style="' + styleToString({
              margin: '6px auto 0',
              width: '2px',
              height: '40px',
              'background-color': tokens.border,
              'font-size': '0',
              'line-height': '0'
            }) + '">&nbsp;</p>' : '') +
          '</td>' +
          '<td valign="top" style="vertical-align:top;padding:0 0 16px;">' +
            (item.title ? '<p style="' + styleToString({
              margin: '0 0 6px',
              color: tokens.textMain,
              'font-size': '16px',
              'line-height': '1.45',
              'font-weight': '700',
              'text-indent': '0'
            }) + '">' + escapeHtml(item.title) + '</p>' : '') +
            renderWeChatBodyBlocks(item.body, function (bodyBlock) {
              if (bodyBlock.type === 'paragraph') {
                return renderWeChatParagraph(bodyBlock, pack, {
                  margin: '0',
                  'text-indent': '0'
                });
              }
              return renderBodyBlock(bodyBlock);
            }) +
          '</td>' +
        '</tr>';
      }).join('');

      return '<section style="margin:0 0 20px;padding:0;">' +
        '<table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;border-spacing:0;">' + rows + '</table>' +
      '</section>';
    }

    function renderMasthead(brandBanner) {
      if (!brandBanner) return '';
      var logoHtml = '';
      if (brandBanner.logoSrc && !/^blob:/i.test(brandBanner.logoSrc)) {
        logoHtml = '<td valign="top" style="width:52px;vertical-align:top;padding-right:12px;">' +
          '<img src="' + escapeHtml(brandBanner.logoSrc) + '" alt="" style="' + styleToString({
            display: 'block',
            width: '52px',
            height: '52px',
            border: '1px solid ' + tokens.border,
            'border-radius': '12px'
          }) + '">' +
        '</td>';
      }
      var textHtml = '';
      if (brandBanner.overline) textHtml += renderWeChatLabel(brandBanner.overline, pack, { margin: '0 0 6px' });
      if (brandBanner.title) {
        textHtml += '<p style="' + styleToString({
          margin: '0',
          color: tokens.textMain,
          'font-size': '16px',
          'line-height': '1.4',
          'font-weight': '700',
          'text-indent': '0'
        }) + '">' + escapeHtml(brandBanner.title) + '</p>';
      }
      if (brandBanner.subtitle) {
        textHtml += '<p style="' + styleToString({
          margin: '4px 0 0',
          color: tokens.textMuted,
          'font-size': '13px',
          'line-height': '1.6',
          'text-indent': '0'
        }) + '">' + escapeHtml(brandBanner.subtitle) + '</p>';
      }
      if (brandBanner.chip) {
        textHtml += '<p style="' + styleToString({
          margin: '8px 0 0',
          'text-indent': '0'
        }) + '"><span style="' + styleToString({
          display: 'inline-block',
          padding: '0 0 4px',
          color: tokens.accentStrong,
          'border-bottom': '1px solid ' + tokens.border,
          'font-size': '12px',
          'line-height': '1.4'
        }) + '">' + escapeHtml(brandBanner.chip) + '</span></p>';
      }

      return '<section style="' + styleToString({
        margin: '0 0 22px',
        padding: '0 0 16px',
        'border-bottom': '1px solid ' + tokens.border
      }) + '"><table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;border-spacing:0;"><tr>' +
        logoHtml +
        '<td valign="top" style="vertical-align:top;">' + textHtml + '</td>' +
      '</tr></table></section>';
    }

    return {
      hero: renderHero,
      intro: renderIntro,
      section: renderSection,
      quote: renderQuote,
      note: renderNote,
      summary: renderSummary,
      metrics: renderMetrics,
      compare: renderCompare,
      timeline: renderTimeline,
      image: function (block) { return renderWeChatImage(block, pack); },
      divider: function () { return renderWeChatDivider(pack); },
      masthead: renderMasthead,
      bodyBlock: renderBodyBlock
    };
  }

  function validateWeChatRenderedHtml(html) {
    var checks = [
      { pattern: /<script/i, message: '输出中不允许包含 <script>' },
      { pattern: /<style/i, message: '输出中不允许包含 <style>' },
      { pattern: /\sclass=/i, message: '输出中不允许包含 class' },
      { pattern: /<svg/i, message: '输出中不允许包含 svg' },
      { pattern: /\son[a-z]+=/i, message: '输出中不允许包含事件属性' },
      { pattern: /position\s*:\s*(absolute|fixed|sticky)/i, message: '输出中不允许包含绝对定位装饰层' }
    ];
    return checks.filter(function (entry) {
      return entry.pattern.test(html);
    }).map(function (entry) {
      return entry.message;
    });
  }

  function renderWeChatDoc(doc, target) {
    var templatePack = resolveWeChatTemplatePack(doc);
    var blockRenderer = createWeChatBlockRenderer(templatePack);
    var tokens = templatePack.tokenSet;
    var htmlParts = [];

    if (doc.brandBanner) {
      htmlParts.push(blockRenderer.masthead(doc.brandBanner));
    }

    doc.blocks.forEach(function (block) {
      if (!block) return;
      if (block.type === 'hero') htmlParts.push(blockRenderer.hero(block));
      else if (block.type === 'intro') htmlParts.push(blockRenderer.intro(block));
      else if (block.type === 'section') htmlParts.push(blockRenderer.section(block));
      else if (block.type === 'metrics') htmlParts.push(blockRenderer.metrics(block));
      else if (block.type === 'compare') htmlParts.push(blockRenderer.compare(block));
      else if (block.type === 'timeline') htmlParts.push(blockRenderer.timeline(block));
      else if (block.type === 'quote') htmlParts.push(blockRenderer.quote(block));
      else if (block.type === 'summary') htmlParts.push(blockRenderer.summary(block));
      else if (block.type === 'note') htmlParts.push(blockRenderer.note(block));
      else if (block.type === 'image') htmlParts.push(blockRenderer.image(block));
      else if (block.type === 'divider') htmlParts.push(blockRenderer.divider(block));
      else htmlParts.push(blockRenderer.bodyBlock(block));
    });

    var html = '<section style="' + styleToString({
      margin: '0',
      padding: '0',
      color: tokens.textMain,
      'background-color': tokens.paper,
      'font-family': tokens.fontFamily,
      'font-size': '16px',
      'line-height': '1.8',
      'word-break': 'break-word'
    }) + '">' + htmlParts.join('') + '</section>';

    var validationErrors = validateWeChatRenderedHtml(html);
    if (validationErrors.length) {
      throw new Error(validationErrors[0]);
    }

    return {
      html: html,
      text: getPlainTextFromHtml(html),
      warnings: uniqueWarnings(doc.warnings || []),
      meta: {
        target: target,
        templatePack: templatePack.id,
        docType: doc.docType,
        familyBridgeId: doc.familyBridgeId,
        headingSystem: doc.headingSystem
      }
    };
  }

  function renderForClipboard(doc) {
    return renderWeChatDoc(doc, 'clipboard');
  }

  function renderForEditorInjection(doc) {
    return renderWeChatDoc(doc, 'editor-injection');
  }

  function renderForDraftSync(doc) {
    return renderWeChatDoc(doc, 'draft-sync');
  }

  function buildWeChatNativeHtmlFragment() {
    return renderForClipboard(buildWeChatDoc());
  }

  function buildWeChatHtmlFragment() {
    return buildWeChatNativeHtmlFragment();
  }

  async function tryWriteClipboard(html, text) {
    if (navigator.clipboard && window.ClipboardItem && window.isSecureContext) {
      var item = new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' })
      });
      await navigator.clipboard.write([item]);
      return true;
    }
    return false;
  }

  function legacyCopyHtml(html, text) {
    var container = document.createElement('div');
    container.setAttribute('contenteditable', 'true');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '375px';
    container.style.opacity = '0.01';
    container.style.pointerEvents = 'none';
    container.style.background = '#ffffff';
    container.style.padding = '16px';
    container.innerHTML = '<div style="width:375px;margin:0 auto;background:#ffffff;">' + html + '</div>';
    document.body.appendChild(container);

    var selection = window.getSelection();
    var range = document.createRange();
    range.selectNodeContents(container);
    selection.removeAllRanges();
    selection.addRange(range);

    function handleCopy(event) {
      if (!event.clipboardData) return;
      event.clipboardData.setData('text/html', html);
      event.clipboardData.setData('text/plain', text || getPlainTextFromHtml(html));
      event.preventDefault();
    }

    document.addEventListener('copy', handleCopy);
    var ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (err) {
      ok = false;
    }
    document.removeEventListener('copy', handleCopy);

    selection.removeAllRanges();
    if (container.parentNode) container.parentNode.removeChild(container);
    return ok;
  }

  async function copyWeChatPayload(payloadBuilder, successText, warnText, errorLabel) {
    try {
      var payload = payloadBuilder();
      var copied = false;
      copied = legacyCopyHtml(payload.html, payload.text);
      if (!copied) {
        try {
          copied = await tryWriteClipboard(payload.html, payload.text);
        } catch (_err) {
          copied = false;
        }
      }
      if (!copied) {
        throw new Error('当前环境不支持富文本复制');
      }

      if (payload.warnings.length > 0) {
        showToast(warnText, 2800);
      } else {
        showToast(successText, 2400);
      }
    } catch (err) {
      console.error('[Tianphoto] WeChat copy error:', err);
      showToast(errorLabel + '失败：' + (err && err.message ? err.message : String(err)), 4200);
    }
  }

  async function copyWeChatNativeRichText() {
    return copyWeChatPayload(
      buildWeChatNativeHtmlFragment,
      '已复制公众号排版，可直接粘贴到公众号后台',
      '已复制公众号排版，页面已按公众号规则自动重排',
      '复制公众号排版'
    );
  }

  async function copyWeChatRichText() {
    return copyWeChatNativeRichText();
  }
