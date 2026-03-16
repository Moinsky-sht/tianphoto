/**
 * editor-stable.js — Tianphoto 内置编辑器 v5.3
 * 自包含 IIFE，零外部依赖（html2canvas 通过 window.html2canvas 引用）
 *
 * v5.3 在 v5.2 基础上继续改进：
 *  - 强制将所有计算后的视觉样式（背景、边框、阴影、圆角、颜色）内联到元素
 *  - 将 ::before/::after 伪元素物化为真实 DOM 元素，确保装饰效果被渲染
 *  - 冻结 transition/animation，避免导出过程中的动画干扰
 *  - SVG 属性 var() 预解析 + backdrop-filter 降级 + background-clip:text 降级
 *  - 导出预览改为主画布 + 缩略条 + 适配/原始宽度切换，更适合检查长图
 *  - 字体工具支持系统字体栈与智能范围应用，避免整篇粗暴替换
 *  - 所有临时修改通过逆序恢复栈 + try/finally 确保 DOM 完好还原
 */
(function () {
  'use strict';

  /* ═══ 常量 ═══ */
  var MOBILE_WIDTH = 375;
  var EXPORT_WIDTH = 1080;
  var EXPORT_SCALE = EXPORT_WIDTH / MOBILE_WIDTH; // 2.88

  var FONT_SCOPE_OPTIONS = [
    { id: 'smart', name: '\u667A\u80FD' },
    { id: 'card', name: '\u5361\u7247' },
    { id: 'page', name: '\u6574\u7BC7' }
  ];

  var FONT_HEADING_SELECTORS = [
    'h1',
    'h2',
    'h3',
    'h4',
    '.wx-eyebrow',
    '.wx-section-index',
    '.wx-card-caption',
    '.phone-brand-copy strong'
  ];
  var FONT_BODY_SELECTORS = [
    'p',
    'li',
    'blockquote',
    'td',
    'th',
    '.wx-lead',
    'small',
    'figcaption',
    '.phone-brand-copy small'
  ];
  var FONT_TARGET_SELECTORS = FONT_HEADING_SELECTORS.concat(FONT_BODY_SELECTORS).join(', ');
  var FONT_SCOPE_CONTAINER_SELECTORS = [
    '.phone-brand-banner',
    '.wx-hero-card',
    '.wx-intro-card',
    '.wx-section-card',
    '.wx-metric-grid',
    '.wx-compare-grid',
    '.wx-timeline-card',
    '.wx-quote-card',
    '.wx-summary-card',
    '.wx-inline-graphic',
    '.wx-badge-art'
  ].join(', ');

  var FONT_OPTIONS = buildFontOptions();

  /* ═══ 状态 ═══ */
  var savedRange = null;
  var exportSlices = [];
  var exportFullImage = null;
  var isExporting = false;
  var currentExportMode = 'slices'; // 'slices' | 'full'
  var currentPreviewIndex = 0;
  var currentPreviewScaleMode = 'fit'; // 'fit' | 'actual'

  var editorEl = null;
  var toolbar = null;
  var overlay = null;
  var dialog = null;
  var toast = null;
  var progressBar = null;

  function getSystemFontPair() {
    var platform = '';
    try {
      platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
    } catch (e) {}

    if (/Mac|iPhone|iPad|iPod/.test(platform)) {
      return {
        heading: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", "Hiragino Sans GB", sans-serif',
        body: 'system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", sans-serif'
      };
    }
    if (/Win/.test(platform)) {
      return {
        heading: 'system-ui, "Segoe UI", "Microsoft YaHei UI", "Microsoft YaHei", sans-serif',
        body: 'system-ui, "Segoe UI", "Microsoft YaHei UI", "Microsoft YaHei", sans-serif'
      };
    }
    if (/Linux|X11/.test(platform)) {
      return {
        heading: 'system-ui, "Noto Sans CJK SC", "Noto Sans", "Ubuntu", sans-serif',
        body: 'system-ui, "Noto Sans CJK SC", "Noto Sans", "Ubuntu", sans-serif'
      };
    }
    return {
      heading: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif',
      body: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif'
    };
  }

  function buildFontOptions() {
    var systemFont = getSystemFontPair();
    return [
      { name: '\u8DDF\u968F\u7CFB\u7EDF UI', heading: systemFont.heading, body: systemFont.body },
      { name: '\u520A\u7269\u9605\u8BFB', heading: '"Songti SC", "STSong", "SimSun", serif', body: '"Avenir Next", "PingFang SC", "Hiragino Sans GB", sans-serif' },
      { name: '\u73B0\u4EE3\u9ED1\u4F53', heading: '"PingFang SC", "Hiragino Sans GB", sans-serif', body: '"PingFang SC", "Microsoft YaHei", sans-serif' },
      { name: '\u624B\u5199\u98CE\u683C', heading: '"Hanzi Pen SC", "STXingkai", cursive', body: '"PingFang SC", sans-serif' },
      { name: '\u5546\u52A1\u6B63\u5F0F', heading: '"Times New Roman", "Songti SC", serif', body: '"Segoe UI", "PingFang SC", sans-serif' },
      { name: '\u79D1\u6280\u611F', heading: '"SF Pro Display", "Helvetica Neue", sans-serif', body: '"SF Pro Text", "PingFang SC", sans-serif' },
      { name: '\u81EA\u5B9A\u4E49\u5B57\u4F53...', heading: 'custom', body: 'custom' }
    ];
  }

  /* ═══ 初始化 ═══ */

  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', onReady);
    } else {
      onReady();
    }
  }

  function onReady() {
    editorEl = document.querySelector('.article-container');
    if (!editorEl) {
      console.error('[Tianphoto] Editor: .article-container not found');
      return;
    }
    enforceFixedWidth();
    createToolbar();
    createExportModal();
    enableEditing();
    bindEvents();
    console.log('[Tianphoto] Editor v5.3 ready');
    showToast('\u7F16\u8F91\u5668\u5DF2\u5C31\u7EEA\uFF0C\u70B9\u51FB\u6587\u5B57\u5373\u53EF\u7F16\u8F91');
  }

  function enforceFixedWidth() {
    editorEl.style.width = MOBILE_WIDTH + 'px';
    editorEl.style.maxWidth = MOBILE_WIDTH + 'px';
    editorEl.style.margin = '0 auto';
    editorEl.style.boxSizing = 'border-box';
    editorEl.setAttribute('data-mobile-width', MOBILE_WIDTH);
    window.addEventListener('resize', function () {
      if (editorEl.offsetWidth !== MOBILE_WIDTH) {
        editorEl.style.width = MOBILE_WIDTH + 'px';
      }
    });
  }

  /* ═══ 工具栏（SVG 图标）═══ */

  function createToolbar() {
    toolbar = document.createElement('div');
    toolbar.className = 'editor-toolbar';

    var leftGroup = document.createElement('div');
    leftGroup.className = 'toolbar-group toolbar-group-tools';
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
      '<button data-command="insertImage" title="\u63D2\u5165\u56FE\u7247"><svg viewBox="0 0 20 20" width="18" height="18"><rect x="2" y="3" width="16" height="14" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="7" cy="8" r="2" fill="currentColor"/><path d="M2 14l4-4 3 3 4-5 5 6H2z" fill="currentColor" opacity=".6"/></svg></button>' +
      '<span class="toolbar-sep"></span>' +
      '<select class="editor-font-select" title="\u9009\u62E9\u5B57\u4F53">' +
        FONT_OPTIONS.map(function (f, i) { return '<option value="' + i + '">' + f.name + '</option>'; }).join('') +
      '</select>' +
      '<select class="editor-font-scope" title="\u5B57\u4F53\u5E94\u7528\u8303\u56F4">' +
        FONT_SCOPE_OPTIONS.map(function (f) { return '<option value="' + f.id + '">' + f.name + '</option>'; }).join('') +
      '</select>' +
      '<button data-command="applyFont" class="toolbar-font-apply" title="\u5E94\u7528\u5F53\u524D\u5B57\u4F53\u5230\u6240\u9009\u8303\u56F4">\u5957\u7528</button>' +
      '<button data-command="resetFont" class="toolbar-font-reset" title="\u6062\u590D\u5F53\u524D\u8303\u56F4\u7684\u9ED8\u8BA4\u5B57\u4F53">\u6062\u590D</button>';

    var rightGroup = document.createElement('div');
    rightGroup.className = 'toolbar-group toolbar-group-actions';
    rightGroup.innerHTML =
      '<button data-command="save" class="toolbar-save" title="\u4FDD\u5B58\u7F51\u9875\u6587\u4EF6"><svg viewBox="0 0 20 20" width="16" height="16"><path d="M3 3h11l3 3v11a1 1 0 01-1 1H4a1 1 0 01-1-1V3zm3 0v5h7V3zm1 9a2 2 0 104 0 2 2 0 00-4 0z" fill="currentColor"/></svg> \u4FDD\u5B58</button>' +
      '<button data-command="export" class="toolbar-export" title="\u5BFC\u51FA PNG"><svg viewBox="0 0 20 20" width="16" height="16"><path d="M10 3v9m0 0l-3-3m3 3l3-3M4 14v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg> \u5BFC\u51FA</button>';

    toolbar.appendChild(leftGroup);
    toolbar.appendChild(rightGroup);

    toolbar.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-command]');
      if (!btn) return;
      var cmd = btn.dataset.command;
      var val = btn.dataset.value;
      var fontSelect = toolbar.querySelector('.editor-font-select');
      var fontScope = toolbar.querySelector('.editor-font-scope');
      if (cmd === 'export') { exportPage(); return; }
      if (cmd === 'save') { saveHtml(); return; }
      if (cmd === 'insertImage') { openImagePicker(); return; }
      if (cmd === 'applyFont') {
        restoreSelection();
        applyFont(parseInt(fontSelect.value, 10), fontScope.value);
        return;
      }
      if (cmd === 'resetFont') {
        restoreSelection();
        resetFontOverrides(fontScope.value);
        return;
      }
      editorEl.focus();
      restoreSelection();
      if (cmd === 'formatBlock') {
        document.execCommand(cmd, false, val);
      } else {
        document.execCommand(cmd, false, val || null);
      }
      captureSelection();
    });

    document.body.appendChild(toolbar);
  }

  /* ═══ 导出预览弹窗 ═══ */

  function createExportModal() {
    overlay = document.createElement('div');
    overlay.className = 'export-overlay';

    dialog = document.createElement('div');
    dialog.className = 'export-dialog';
    dialog.innerHTML =
      '<div class="export-header">' +
        '<h3>\u5BFC\u51FA\u9884\u89C8</h3>' +
        '<div class="export-header-actions">' +
          '<div class="export-mode-switch">' +
            '<button class="export-mode-btn is-active" data-mode="slices">\u5207\u7247</button>' +
            '<button class="export-mode-btn" data-mode="full">\u5355\u56FE</button>' +
          '</div>' +
          '<div class="export-scale-switch">' +
            '<button class="export-scale-btn is-active" data-scale="fit">\u5B8C\u6574\u9002\u914D</button>' +
            '<button class="export-scale-btn" data-scale="actual">\u539F\u59CB\u5BBD\u5EA6</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="export-progress" style="display:none;">' +
        '<div class="export-progress-bar"><div class="export-progress-fill"></div></div>' +
        '<div class="export-progress-text">\u6B63\u5728\u751F\u6210...</div>' +
      '</div>' +
      '<div class="export-gallery">' +
        '<div class="export-preview-stage"></div>' +
        '<div class="export-thumb-strip"></div>' +
      '</div>' +
      '<div class="export-footer">' +
        '<div class="export-info"></div>' +
        '<div class="export-actions">' +
          '<button class="export-btn-download">\u4E0B\u8F7D\u5168\u90E8</button>' +
          '<button class="export-btn-close">\u5173\u95ED</button>' +
        '</div>' +
      '</div>';

    dialog.querySelector('.export-btn-download').addEventListener('click', function () {
      if (currentExportMode === 'full') {
        downloadFullImage();
      } else {
        downloadAllSlices();
      }
    });
    dialog.querySelector('.export-btn-close').addEventListener('click', hideExportModal);

    // Mode switch
    dialog.querySelectorAll('.export-mode-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mode = this.dataset.mode;
        if (mode === currentExportMode) return;
        currentExportMode = mode;
        currentPreviewIndex = 0;
        dialog.querySelectorAll('.export-mode-btn').forEach(function (b) { b.classList.remove('is-active'); });
        this.classList.add('is-active');
        renderGallery();
      });
    });

    dialog.querySelectorAll('.export-scale-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var scaleMode = this.dataset.scale;
        if (scaleMode === currentPreviewScaleMode) return;
        currentPreviewScaleMode = scaleMode;
        updatePreviewScaleButtons();
        renderGallery();
      });
    });

    progressBar = dialog.querySelector('.export-progress');
    overlay.appendChild(dialog);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) hideExportModal();
    });
    document.body.appendChild(overlay);
  }

  function updatePreviewScaleButtons() {
    if (!dialog) return;
    dialog.querySelectorAll('.export-scale-btn').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.dataset.scale === currentPreviewScaleMode);
    });
  }

  function showExportModal() {
    currentPreviewIndex = 0;
    currentPreviewScaleMode = 'fit';
    updatePreviewScaleButtons();
    overlay.classList.add('is-visible');
  }
  function hideExportModal() { overlay.classList.remove('is-visible'); }

  function setProgress(pct, text) {
    progressBar.style.display = '';
    progressBar.querySelector('.export-progress-fill').style.width = pct + '%';
    if (text) progressBar.querySelector('.export-progress-text').textContent = text;
  }
  function hideProgress() { progressBar.style.display = 'none'; }

  /* ═══ 编辑 ═══ */

  function enableEditing() {
    // Keep the root container non-editable so Chrome doesn't add a trailing
    // editing line box that makes export height drift from the on-screen page.
    editorEl.setAttribute('spellcheck', 'false');
    editorEl.querySelectorAll('h1, h2, h3, h4, p, li, td, th, .wx-lead, .wx-eyebrow, strong, small').forEach(function (el) {
      if (!el.hasAttribute('contenteditable')) el.setAttribute('contenteditable', 'true');
    });
  }

  function getFontScopeLabel(scope) {
    var matched = FONT_SCOPE_OPTIONS.find(function (item) { return item.id === scope; });
    return matched ? matched.name : '\u667A\u80FD';
  }

  function getDefaultCustomFont(role) {
    return role === 'heading'
      ? 'system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif'
      : 'system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
  }

  function resolveFontOption(fontIndex) {
    var font = FONT_OPTIONS[fontIndex];
    if (!font) return null;
    if (font.heading !== 'custom' || font.body !== 'custom') return font;

    var customHeading = prompt('\u8BF7\u8F93\u5165\u6807\u9898\u5B57\u4F53\uFF08CSS font-family \u6216\u7CFB\u7EDF\u5B57\u4F53\u540D\u79F0\uFF09', getDefaultCustomFont('heading'));
    if (!customHeading) return null;
    var customBody = prompt('\u8BF7\u8F93\u5165\u6B63\u6587\u5B57\u4F53\uFF08CSS font-family \u6216\u7CFB\u7EDF\u5B57\u4F53\u540D\u79F0\uFF09', getDefaultCustomFont('body'));
    if (!customBody) return null;
    return { name: '\u81EA\u5B9A\u4E49\u5B57\u4F53', heading: customHeading, body: customBody };
  }

  function ensureDynamicFontStyle() {
    var style = document.getElementById('tianphoto-dynamic-font');
    if (!style) {
      style = document.createElement('style');
      style.id = 'tianphoto-dynamic-font';
      document.head.appendChild(style);
    }
    return style;
  }

  function buildScopedSelectors(rootSelector, selectors) {
    return selectors.map(function (selector) {
      return rootSelector + ' ' + selector;
    }).join(',');
  }

  function applyPageFont(font) {
    var style = ensureDynamicFontStyle();
    style.textContent =
      buildScopedSelectors('.article-container', FONT_HEADING_SELECTORS) + '{font-family:' + font.heading + ' !important;}' +
      '.article-container{font-family:' + font.body + ' !important;}' +
      buildScopedSelectors('.article-container', FONT_BODY_SELECTORS) + '{font-family:' + font.body + ' !important;}';
  }

  function getFontTargets(root) {
    if (!root) return [];
    var targets = [];
    if (root.matches && root.matches(FONT_TARGET_SELECTORS)) targets.push(root);
    return targets.concat(Array.from(root.querySelectorAll(FONT_TARGET_SELECTORS)));
  }

  function getRangeAnchorElement(range) {
    if (!range) return null;
    var node = range.startContainer;
    if (!node) return null;
    return node.nodeType === 1 ? node : node.parentElement;
  }

  function getSelectionRangeInEditor() {
    var sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      var liveRange = sel.getRangeAt(0);
      if (editorEl.contains(liveRange.commonAncestorContainer)) {
        return liveRange;
      }
    }
    return savedRange ? savedRange.cloneRange() : null;
  }

  function uniqueElements(elements) {
    return elements.filter(function (element, index) {
      return element && elements.indexOf(element) === index;
    });
  }

  function collectTargetsFromRange(root, range) {
    if (!root) return [];
    var targets = getFontTargets(root);
    if (!range) return uniqueElements(targets);
    var matched = targets.filter(function (target) {
      try {
        return range.intersectsNode(target);
      } catch (e) {
        return false;
      }
    });
    if (matched.length > 0) return uniqueElements(matched);

    var anchor = getRangeAnchorElement(range);
    if (!anchor || !anchor.closest) return [];
    var closest = anchor.closest(FONT_TARGET_SELECTORS);
    return closest && root.contains(closest) ? [closest] : [];
  }

  function getSmartFontTargets(range) {
    var targets = collectTargetsFromRange(editorEl, range);
    if (targets.length > 0) return targets;

    var anchor = getRangeAnchorElement(range);
    if (!anchor || !anchor.closest) return [];

    var closestCard = anchor.closest(FONT_SCOPE_CONTAINER_SELECTORS);
    return closestCard ? getFontTargets(closestCard) : [];
  }

  function getCardFontTargets(range) {
    var anchor = getRangeAnchorElement(range);
    if (!anchor || !anchor.closest) return [];
    var closestCard = anchor.closest(FONT_SCOPE_CONTAINER_SELECTORS);
    return closestCard ? getFontTargets(closestCard) : [];
  }

  function isHeadingTarget(target) {
    return !!(target && target.matches && target.matches(FONT_HEADING_SELECTORS.join(',')));
  }

  function applyLocalFontToTarget(target, font) {
    if (!target || !target.style) return;
    target.style.fontFamily = isHeadingTarget(target) ? font.heading : font.body;
    target.setAttribute('data-tp-font-local', 'true');
  }

  function clearLocalFontFromTarget(target) {
    if (!target || !target.style) return;
    target.style.fontFamily = '';
    target.removeAttribute('data-tp-font-local');
    if (target.getAttribute('style') === '') {
      target.removeAttribute('style');
    }
  }

  function resolveFontTargetsForScope(scope) {
    var range = getSelectionRangeInEditor();
    if (scope === 'card') return getCardFontTargets(range);
    if (scope === 'smart') return getSmartFontTargets(range);
    return [];
  }

  function applyFont(fontIndex, scope) {
    var font = resolveFontOption(fontIndex);
    if (!font) return;

    if (scope === 'page') {
      applyPageFont(font);
      showToast('\u5DF2\u5E94\u7528 ' + font.name + ' \u00B7 \u6574\u7BC7');
      return;
    }

    var targets = resolveFontTargetsForScope(scope);
    if (!targets.length) {
      applyPageFont(font);
      showToast('\u672A\u627E\u5230\u5F53\u524D\u6587\u5B57\u5757\uFF0C\u5DF2\u6539\u4E3A\u6574\u7BC7\u5E94\u7528 ' + font.name);
      return;
    }

    targets.forEach(function (target) {
      applyLocalFontToTarget(target, font);
    });
    showToast('\u5DF2\u5E94\u7528 ' + font.name + ' \u00B7 ' + getFontScopeLabel(scope));
  }

  function resetFontOverrides(scope) {
    if (scope === 'page') {
      var pageStyle = document.getElementById('tianphoto-dynamic-font');
      if (pageStyle && pageStyle.parentNode) {
        pageStyle.parentNode.removeChild(pageStyle);
      }
      showToast('\u5DF2\u6062\u590D\u6574\u7BC7\u9ED8\u8BA4\u5B57\u4F53');
      return;
    }

    var targets = resolveFontTargetsForScope(scope);
    if (!targets.length) {
      showToast('\u6CA1\u627E\u5230\u53EF\u6062\u590D\u7684\u6587\u5B57\u5757', 2600);
      return;
    }

    targets.forEach(function (target) {
      clearLocalFontFromTarget(target);
    });
    showToast('\u5DF2\u6062\u590D ' + getFontScopeLabel(scope) + ' \u7684\u9ED8\u8BA4\u5B57\u4F53');
  }

  /* ═══ 图片插入 ═══ */

  function openImagePicker() {
    var input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*'; input.multiple = true;
    input.addEventListener('change', function () { if (input.files && input.files.length) handleImageFiles(input.files); });
    input.click();
  }

  function fileToDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function buildImageBlock(dataUrl) {
    return '<figure class="wx-media-frame"><img src="' + dataUrl + '" alt="\u63D2\u56FE" class="polished-image" style="max-width:100%;height:auto;" /></figure>';
  }

  function insertHtmlAtCursor(html) {
    restoreSelection(); editorEl.focus();
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) { editorEl.insertAdjacentHTML('beforeend', html); return; }
    var range = sel.getRangeAt(0); range.deleteContents();
    var tpl = document.createElement('template'); tpl.innerHTML = html.trim();
    var frag = tpl.content; var lastNode = frag.lastChild; range.insertNode(frag);
    if (lastNode) { range.setStartAfter(lastNode); range.collapse(true); sel.removeAllRanges(); sel.addRange(range); }
    captureSelection();
  }

  async function handleImageFiles(files) {
    for (var i = 0; i < files.length; i++) {
      if (!files[i].type.startsWith('image/')) continue;
      try { var d = await fileToDataUrl(files[i]); insertHtmlAtCursor(buildImageBlock(d)); } catch (e) { console.error(e); }
    }
    showToast('\u56FE\u7247\u63D2\u5165\u5B8C\u6210');
  }

  /* ═══ 选区 ═══ */

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
    var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(savedRange);
    return true;
  }

  /* ═══ 事件 ═══ */

  function bindEvents() {
    editorEl.addEventListener('mouseup', captureSelection);
    editorEl.addEventListener('keyup', captureSelection);
    editorEl.addEventListener('dragover', function (e) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; editorEl.classList.add('drag-over'); });
    editorEl.addEventListener('dragleave', function () { editorEl.classList.remove('drag-over'); });
    editorEl.addEventListener('drop', function (e) { e.preventDefault(); editorEl.classList.remove('drag-over'); if (e.dataTransfer.files && e.dataTransfer.files.length) handleImageFiles(e.dataTransfer.files); });
    editorEl.addEventListener('paste', function (e) {
      var items = (e.clipboardData || e.originalEvent.clipboardData).items;
      var hasImg = false;
      for (var i = 0; i < items.length; i++) { if (items[i].type.indexOf('image') !== -1) { hasImg = true; break; } }
      if (hasImg) { e.preventDefault(); var files = []; for (var j = 0; j < items.length; j++) { if (items[j].type.indexOf('image') !== -1) files.push(items[j].getAsFile()); } handleImageFiles(files); }
    });
    document.addEventListener('keydown', function (e) { if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); saveHtml(); } });
  }

  /* ═══ 保存 HTML ═══ */

  function saveHtml() {
    var clone = document.documentElement.cloneNode(true);
    clone.querySelectorAll('.editor-toolbar, .export-overlay, .editor-toast').forEach(function (el) { el.parentNode.removeChild(el); });
    var container = clone.querySelector('.article-container');
    if (container) container.removeAttribute('contenteditable');
    clone.querySelectorAll('.article-container [contenteditable]').forEach(function (el) { el.removeAttribute('contenteditable'); });
    var dynamicFont = document.getElementById('tianphoto-dynamic-font');
    if (dynamicFont) { var s = document.createElement('style'); s.textContent = dynamicFont.textContent; clone.querySelector('head').appendChild(s); }
    var html = '<!DOCTYPE html>\n' + clone.outerHTML;
    var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var filename = (document.title || 'article').replace(/[^\w\u4e00-\u9fff-]/g, '_') + '.html';
    var link = document.createElement('a'); link.download = filename; link.href = url; link.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
    showToast('\u6587\u4EF6\u5DF2\u4FDD\u5B58');
  }

  /* ═══ Toast ═══ */

  function showToast(msg, duration) {
    if (!toast) { toast = document.createElement('div'); toast.className = 'editor-toast'; document.body.appendChild(toast); }
    toast.textContent = msg;
    toast.classList.add('is-visible');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () { toast.classList.remove('is-visible'); }, duration || 2000);
  }

  /* ═══════════════════════════════════════════════════
     导出引擎 v5.3 — 预览与 WYSIWYG 协同修正
     ═══════════════════════════════════════════════════

     v5.3 核心改进：
     1. 强制将所有计算后的视觉样式内联到每个元素，
        确保 html2canvas 不依赖 CSS 变量解析。
     2. 将 ::before/::after 伪元素物化为真实 DOM 节点，
        因为 html2canvas 对伪元素支持极差。
     3. 冻结 transition/animation 避免导出中间态。
     4. SVG 属性 var() 预解析（html2canvas 完全不认 SVG 属性中的 var()）。
     5. backdrop-filter 降级 + background-clip:text 降级。
     6. 所有修改通过逆序恢复栈 + try/finally 保护。
     ═══════════════════════════════════════════════════ */

  /** 需要强制内联的视觉属性列表 */
  var VISUAL_PROPS = [
    'backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat',
    'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
    'borderTopStyle', 'borderRightStyle', 'borderBottomStyle', 'borderLeftStyle',
    'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius',
    'boxShadow', 'color', 'opacity'
  ];

  /** 伪元素需要复制的样式属性 */
  var PSEUDO_PROPS = [
    'position', 'top', 'right', 'bottom', 'left',
    'display', 'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
    'backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat',
    'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
    'borderTopStyle', 'borderRightStyle', 'borderBottomStyle', 'borderLeftStyle',
    'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius',
    'boxShadow', 'opacity', 'zIndex', 'overflow',
    'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'boxSizing'
  ];

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

  /**
   * 导出前的全面 DOM 准备，返回 restore 函数。
   * 核心策略：将浏览器已解析的计算样式全部内联，
   * 让 html2canvas 无需依赖 CSS 变量解析即可正确渲染。
   */
  function prepareForExport() {
    var vars = collectCssVars();
    var restoreOps = [];

    // ────── 0) 冻结 transition/animation ──────
    var freezeStyle = document.createElement('style');
    freezeStyle.id = 'tianphoto-export-freeze';
    freezeStyle.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; }';
    document.head.appendChild(freezeStyle);
    restoreOps.push(function () {
      if (freezeStyle.parentNode) freezeStyle.parentNode.removeChild(freezeStyle);
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

    // ────── 2) 物化伪元素 ::before / ::after ──────
    // html2canvas 对伪元素支持极差，将有视觉效果的伪元素转为真实 DOM 节点
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

          // 判断是否有视觉效果（背景、边框、内容文本）
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

          // 复制所有视觉属性的计算值
          PSEUDO_PROPS.forEach(function (prop) {
            try {
              var val = cs[prop];
              if (val !== undefined && val !== '') node.style[prop] = val;
            } catch (e) {}
          });

          // 设置文本内容
          if (hasText) {
            var text = content.replace(/^["']|["']$/g, '');
            if (text) {
              node.textContent = text;
              // 复制文本相关样式
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
            el.insertBefore(node, el.firstChild);
          } else {
            el.appendChild(node);
          }

          restoreOps.push(function () {
            if (node.parentNode) node.parentNode.removeChild(node);
          });
        } catch (e) {}
      });
    });

    // ────── 3) 强制内联所有计算后的视觉样式 ──────
    // html2canvas 可能无法正确解析 CSS 自定义属性（var()），
    // 将浏览器已计算的最终值直接写入 inline style 确保渲染正确
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
    editorEl.querySelectorAll('*').forEach(function (el) {
      try {
        var cs = getComputedStyle(el);
        var bf = cs.getPropertyValue('backdrop-filter') || cs.getPropertyValue('-webkit-backdrop-filter');
        if (bf && bf !== 'none') {
          var origBd = el.style.backdropFilter || '';
          var origWbd = el.style.webkitBackdropFilter || '';
          var origBg = el.style.backgroundColor || '';
          var bg = cs.backgroundColor;
          if (bg && /rgba/.test(bg)) {
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

  /**
   * 核心渲染：在实时 DOM 上渲染 editorEl 为 canvas。
   *
   * 关键：只传 scale、backgroundColor、scrollY，不传 x/y/width/height/windowWidth。
   * html2canvas 自动从 editorEl 的 getBoundingClientRect() 计算渲染区域。
   */
  async function renderToCanvas() {
    // 等待布局稳定
    await new Promise(function (r) { requestAnimationFrame(r); });
    await new Promise(function (r) { setTimeout(r, 300); });
    if (document.fonts && document.fonts.ready) await document.fonts.ready;

    // 滚动到顶部，确保 html2canvas 能看到完整内容
    var prevScroll = window.scrollY;
    window.scrollTo(0, 0);
    // 再等一帧让滚动和内联样式生效
    await new Promise(function (r) { requestAnimationFrame(r); });
    await new Promise(function (r) { setTimeout(r, 100); });

    var pageBg = getComputedStyle(document.body).backgroundColor;

    var canvas = await window.html2canvas(editorEl, {
      backgroundColor: (pageBg && pageBg !== 'rgba(0, 0, 0, 0)') ? pageBg : '#ffffff',
      scale: EXPORT_SCALE,
      useCORS: true,
      logging: false,
      scrollY: 0,
      scrollX: 0
    });

    window.scrollTo(0, prevScroll);
    return canvas;
  }

  /**
   * 将 canvas 按固定高度切片
   */
  function sliceCanvas(canvas) {
    var MAX_SLICE_PX = 5000;
    var totalH = canvas.height;
    var w = canvas.width;

    if (totalH <= MAX_SLICE_PX) {
      return [{
        dataUrl: canvas.toDataURL('image/png'),
        width: Math.round(w / EXPORT_SCALE),
        height: Math.round(totalH / EXPORT_SCALE),
        index: 1
      }];
    }

    var slices = [];
    var y = 0;
    while (y < totalH) {
      var h = Math.min(MAX_SLICE_PX, totalH - y);
      var sc = document.createElement('canvas');
      sc.width = w; sc.height = h;
      sc.getContext('2d').drawImage(canvas, 0, y, w, h, 0, 0, w, h);
      slices.push({
        dataUrl: sc.toDataURL('image/png'),
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
    showToast('\u6B63\u5728\u5BFC\u51FA...');

    var exportPrep = null;
    try {
      if (typeof window.html2canvas !== 'function') throw new Error('html2canvas \u672A\u52A0\u8F7D');

      // 在 editorEl 上做临时修改
      exportPrep = prepareForExport();

      // 渲染
      var canvas = await renderToCanvas();

      // 渲染完成，恢复 DOM
      exportPrep.restore();
      exportPrep = null;

      // 生成切片
      exportSlices = sliceCanvas(canvas);
      exportSlices.forEach(function (s, i) {
        s.filename = '\u5207\u7247-' + (i + 1) + '.png';
      });

      // 生成单图
      exportFullImage = {
        dataUrl: canvas.toDataURL('image/png'),
        width: Math.round(canvas.width / EXPORT_SCALE),
        height: Math.round(canvas.height / EXPORT_SCALE),
        filename: (document.title || 'article').replace(/[^\w\u4e00-\u9fff-]/g, '_') + '.png'
      };

      // 渲染成功，弹出预览弹窗
      showExportModal();
      renderGallery();
      showToast('\u5BFC\u51FA\u5B8C\u6210');

    } catch (err) {
      console.error('[Tianphoto] Export error:', err);
      showToast('\u5BFC\u51FA\u5931\u8D25\uFF1A' + (err.message || err), 4000);
    } finally {
      if (exportPrep) {
        try { exportPrep.restore(); } catch (e) { console.warn('[Tianphoto] Final restore error:', e); }
      }
      isExporting = false;
    }
  }

  /* ═══ 预览渲染 ═══ */

  function getCurrentPreviewItems() {
    if (currentExportMode === 'full') {
      return exportFullImage ? [exportFullImage] : [];
    }
    return exportSlices || [];
  }

  function getPreviewInfo(activeItem, itemCount) {
    if (currentExportMode === 'full') {
      return '\u5355\u5F20\u5B8C\u6574\u56FE\u7247 \u00B7 ' + activeItem.width + 'x' + activeItem.height + 'px';
    }
    return '\u5F53\u524D\u9884\u89C8 ' + (currentPreviewIndex + 1) + '/' + itemCount + ' \u00B7 ' + activeItem.width + 'x' + activeItem.height + 'px';
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
    if (!exportFullImage) return;
    triggerDownload(exportFullImage.dataUrl, exportFullImage.filename);
    showToast('\u5DF2\u4E0B\u8F7D\u5B8C\u6574\u56FE\u7247');
  }

  function downloadAllSlices() {
    exportSlices.forEach(function (slice, idx) {
      setTimeout(function () { triggerDownload(slice.dataUrl, slice.filename); }, idx * 200);
    });
    showToast('\u5F00\u59CB\u4E0B\u8F7D ' + exportSlices.length + ' \u5F20\u56FE\u7247...');
  }

  /* ═══ 启动 ═══ */
  init();
})();
