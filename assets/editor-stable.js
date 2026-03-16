/**
 * editor-stable.js — Tianphoto 内置编辑器 v5.6
 * 自包含 IIFE，零外部依赖（html2canvas 通过 window.html2canvas 引用）
 *
 * v5.6 继续聚焦所见即所得导出：
 *  - 完全移除对系统标签页/屏幕截图权限的依赖，导出始终走页面内纯渲染链路
 *  - 改为“混合导出”：普通主题走单通道原始渲染，ops-console 保留双通道修正
 *  - 对 ops-console / tech 系列的背景网格、内框、标签底板做定向补绘，修复 html2canvas 偏差
 *  - 导出时同步页面背景，避免出现透明底或补错色块
 *  - 冻结 transition/animation，避免导出过程中的动画干扰
 *  - SVG 属性 var() 预解析 + backdrop-filter 降级 + background-clip:text 降级
 *  - 导出预览保持主画布 + 缩略条 + 适配/原始宽度切换
 *  - 编辑器工具栏简化为排版、对齐、插图、保存、导出等核心操作
 */
(function () {
  'use strict';

  /* ═══ 常量 ═══ */
  var MOBILE_WIDTH = 375;
  var EXPORT_WIDTH = 1080;
  var EXPORT_SCALE = EXPORT_WIDTH / MOBILE_WIDTH; // 2.88

  var FONT_SCOPE_OPTIONS = [
    { id: 'block', name: '\u5F53\u524D\u5757' },
    { id: 'card', name: '\u5361\u7247' },
    { id: 'page', name: '\u6574\u7BC7' }
  ];

  var FONT_ROLE_OPTIONS = [
    { id: 'pair', name: '\u6807\u9898+\u6B63\u6587' },
    { id: 'heading', name: '\u4EC5\u6807\u9898' },
    { id: 'body', name: '\u4EC5\u6B63\u6587' }
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
  var ALIGN_TARGET_SELECTORS = [
    'h1',
    'h2',
    'h3',
    'h4',
    'p',
    'li',
    'blockquote',
    'td',
    'th',
    '.wx-lead',
    '.wx-eyebrow',
    'small',
    'figcaption'
  ].join(', ');
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
  var pageFontState = {
    heading: '',
    body: ''
  };

  /* ═══ 状态 ═══ */
  var savedRange = null;
  var exportSlices = [];
  var exportFullImage = null;
  var isExporting = false;
  var currentExportMode = 'full'; // 'slices' | 'full'
  var currentPreviewIndex = 0;
  var currentPreviewScaleMode = 'actual'; // 'fit' | 'actual'

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
    hydratePageFontState();
    enforceFixedWidth();
    createToolbar();
    createExportModal();
    enableEditing();
    bindEvents();
    console.log('[Tianphoto] Editor v5.6 ready');
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
      '<button data-command="justifyLeft" title="\u5DE6\u5BF9\u9F50"><svg viewBox="0 0 20 20" width="18" height="18"><rect x="3" y="4" width="12" height="2" rx="1" fill="currentColor"/><rect x="3" y="9" width="10" height="2" rx="1" fill="currentColor"/><rect x="3" y="14" width="14" height="2" rx="1" fill="currentColor"/></svg></button>' +
      '<button data-command="justifyCenter" title="\u5C45\u4E2D\u5BF9\u9F50"><svg viewBox="0 0 20 20" width="18" height="18"><rect x="4" y="4" width="12" height="2" rx="1" fill="currentColor"/><rect x="5" y="9" width="10" height="2" rx="1" fill="currentColor"/><rect x="3" y="14" width="14" height="2" rx="1" fill="currentColor"/></svg></button>' +
      '<button data-command="justifyRight" title="\u53F3\u5BF9\u9F50"><svg viewBox="0 0 20 20" width="18" height="18"><rect x="5" y="4" width="12" height="2" rx="1" fill="currentColor"/><rect x="7" y="9" width="10" height="2" rx="1" fill="currentColor"/><rect x="3" y="14" width="14" height="2" rx="1" fill="currentColor"/></svg></button>' +
      '<span class="toolbar-sep"></span>' +
      '<button data-command="insertUnorderedList" title="\u65E0\u5E8F\u5217\u8868"><svg viewBox="0 0 20 20" width="18" height="18"><circle cx="3" cy="5" r="1.5" fill="currentColor"/><circle cx="3" cy="10" r="1.5" fill="currentColor"/><circle cx="3" cy="15" r="1.5" fill="currentColor"/><rect x="7" y="4" width="11" height="2" rx="1" fill="currentColor"/><rect x="7" y="9" width="11" height="2" rx="1" fill="currentColor"/><rect x="7" y="14" width="11" height="2" rx="1" fill="currentColor"/></svg></button>' +
      '<button data-command="insertOrderedList" title="\u6709\u5E8F\u5217\u8868"><svg viewBox="0 0 20 20" width="18" height="18"><text x="1" y="7" font-size="7" font-weight="700" fill="currentColor">1</text><text x="1" y="12.5" font-size="7" font-weight="700" fill="currentColor">2</text><text x="1" y="18" font-size="7" font-weight="700" fill="currentColor">3</text><rect x="7" y="4" width="11" height="2" rx="1" fill="currentColor"/><rect x="7" y="9" width="11" height="2" rx="1" fill="currentColor"/><rect x="7" y="14" width="11" height="2" rx="1" fill="currentColor"/></svg></button>' +
      '<button data-command="formatBlock" data-value="blockquote" title="\u5F15\u7528"><svg viewBox="0 0 20 20" width="18" height="18"><path d="M3 4h3a3 3 0 013 3v1a3 3 0 01-3 3H5l-1 3H2l1-3a3 3 0 01-1-2V7a3 3 0 011-3zm8 0h3a3 3 0 013 3v1a3 3 0 01-3 3h-1l-1 3h-2l1-3a3 3 0 01-1-2V7a3 3 0 011-3z" fill="currentColor"/></svg></button>' +
      '<span class="toolbar-sep"></span>' +
      '<button data-command="insertImage" title="\u63D2\u5165\u56FE\u7247"><svg viewBox="0 0 20 20" width="18" height="18"><rect x="2" y="3" width="16" height="14" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="7" cy="8" r="2" fill="currentColor"/><path d="M2 14l4-4 3 3 4-5 5 6H2z" fill="currentColor" opacity=".6"/></svg></button>';

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
      if (cmd === 'export') { exportPage(); return; }
      if (cmd === 'save') { saveHtml(); return; }
      if (cmd === 'insertImage') { openImagePicker(); return; }
      if (cmd === 'justifyLeft' || cmd === 'justifyCenter' || cmd === 'justifyRight') {
        restoreSelection();
        applyTextAlignment(cmd);
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
            '<button class="export-mode-btn" data-mode="slices">\u5207\u7247</button>' +
            '<button class="export-mode-btn is-active" data-mode="full">\u5355\u56FE</button>' +
          '</div>' +
          '<div class="export-scale-switch">' +
            '<button class="export-scale-btn" data-scale="fit">\u5B8C\u6574\u9002\u914D</button>' +
            '<button class="export-scale-btn is-active" data-scale="actual">\u539F\u59CB\u5BBD\u5EA6</button>' +
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
        updateExportModeButtons();
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

  function updateExportModeButtons() {
    if (!dialog) return;
    dialog.querySelectorAll('.export-mode-btn').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.dataset.mode === currentExportMode);
    });
  }

  function updatePreviewScaleButtons() {
    if (!dialog) return;
    dialog.querySelectorAll('.export-scale-btn').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.dataset.scale === currentPreviewScaleMode);
    });
  }

  function showExportModal() {
    currentExportMode = 'full';
    currentPreviewIndex = 0;
    currentPreviewScaleMode = 'actual';
    updateExportModeButtons();
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
    return matched ? matched.name : '\u5F53\u524D\u5757';
  }

  function getFontRoleLabel(role) {
    var matched = FONT_ROLE_OPTIONS.find(function (item) { return item.id === role; });
    return matched ? matched.name : '\u6807\u9898+\u6B63\u6587';
  }

  function getDefaultCustomFont(role) {
    return role === 'heading'
      ? 'system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif'
      : 'system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
  }

  function resolveFontOption(fontIndex, role) {
    var font = FONT_OPTIONS[fontIndex];
    if (!font) return null;
    if (font.heading !== 'custom' || font.body !== 'custom') return font;

    var customHeading = getDefaultCustomFont('heading');
    var customBody = getDefaultCustomFont('body');

    if (role !== 'body') {
      customHeading = prompt('\u8BF7\u8F93\u5165\u6807\u9898\u5B57\u4F53\uFF08CSS font-family \u6216\u7CFB\u7EDF\u5B57\u4F53\u540D\u79F0\uFF09', customHeading);
      if (!customHeading) return null;
    }
    if (role !== 'heading') {
      customBody = prompt('\u8BF7\u8F93\u5165\u6B63\u6587\u5B57\u4F53\uFF08CSS font-family \u6216\u7CFB\u7EDF\u5B57\u4F53\u540D\u79F0\uFF09', customBody);
      if (!customBody) return null;
    }

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

  function hydratePageFontState() {
    if (!editorEl) return;
    pageFontState.heading = editorEl.getAttribute('data-tp-page-heading-font') || '';
    pageFontState.body = editorEl.getAttribute('data-tp-page-body-font') || '';
    if ((pageFontState.heading || pageFontState.body) && !document.getElementById('tianphoto-dynamic-font')) {
      rebuildPageFontStyle();
    }
  }

  function buildScopedSelectors(rootSelector, selectors) {
    return selectors.map(function (selector) {
      return rootSelector + ' ' + selector;
    }).join(',');
  }

  function rebuildPageFontStyle() {
    var style = ensureDynamicFontStyle();
    var blocks = [];

    if (pageFontState.heading) editorEl.setAttribute('data-tp-page-heading-font', pageFontState.heading);
    else editorEl.removeAttribute('data-tp-page-heading-font');

    if (pageFontState.body) editorEl.setAttribute('data-tp-page-body-font', pageFontState.body);
    else editorEl.removeAttribute('data-tp-page-body-font');

    if (pageFontState.heading) {
      blocks.push(
        buildScopedSelectors('.article-container', FONT_HEADING_SELECTORS) +
        '{font-family:' + pageFontState.heading + ' !important;}'
      );
    }

    if (pageFontState.body) {
      blocks.push('.article-container{font-family:' + pageFontState.body + ' !important;}');
      blocks.push(
        buildScopedSelectors('.article-container', FONT_BODY_SELECTORS) +
        '{font-family:' + pageFontState.body + ' !important;}'
      );
    }

    if (!blocks.length) {
      if (style.parentNode) style.parentNode.removeChild(style);
      return;
    }

    style.textContent = blocks.join('');
  }

  function applyPageFont(font, role) {
    if (role === 'pair' || role === 'heading') pageFontState.heading = font.heading;
    if (role === 'pair' || role === 'body') pageFontState.body = font.body;
    rebuildPageFontStyle();
  }

  function syncFontSelectState(value) {
    if (!toolbar) return;
    var fontSelect = toolbar.querySelector('.editor-font-select');
    if (!fontSelect) return;
    fontSelect.value = value;
    fontSelect.dataset.lastValue = value;
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

  function getBlockFontTargets(range) {
    var targets = collectTargetsFromRange(editorEl, range);
    if (targets.length > 0) return targets;

    var anchor = getRangeAnchorElement(range);
    if (!anchor || !anchor.closest) return [];

    var closestTarget = anchor.closest(FONT_TARGET_SELECTORS);
    return closestTarget && editorEl.contains(closestTarget) ? [closestTarget] : [];
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

  function getAlignmentTargets(range) {
    var targets = [];
    if (range) {
      targets = collectTargetsFromRange(editorEl, range).filter(function (target) {
        return target && target.matches && target.matches(ALIGN_TARGET_SELECTORS);
      });
    }
    if (targets.length > 0) return uniqueElements(targets);

    var anchor = getRangeAnchorElement(range);
    if (!anchor || !anchor.closest) return [];
    var closestTarget = anchor.closest(ALIGN_TARGET_SELECTORS);
    return closestTarget && editorEl.contains(closestTarget) ? [closestTarget] : [];
  }

  function getAlignmentLabel(command) {
    if (command === 'justifyCenter') return '\u5C45\u4E2D\u5BF9\u9F50';
    if (command === 'justifyRight') return '\u53F3\u5BF9\u9F50';
    return '\u5DE6\u5BF9\u9F50';
  }

  function applyTextAlignment(command) {
    var alignment = command === 'justifyCenter' ? 'center' : command === 'justifyRight' ? 'right' : 'left';
    var targets = getAlignmentTargets(getSelectionRangeInEditor());
    if (!targets.length) {
      showToast('\u8BF7\u5148\u9009\u4E2D\u8981\u5BF9\u9F50\u7684\u6587\u5B57\u5757', 2600);
      return false;
    }

    targets.forEach(function (target) {
      target.style.textAlign = alignment;
    });
    showToast('\u5DF2\u8BBE\u4E3A' + getAlignmentLabel(command));
    return true;
  }

  function filterTargetsByRole(targets, role) {
    if (role === 'pair') return uniqueElements(targets);
    return uniqueElements(targets.filter(function (target) {
      return role === 'heading' ? isHeadingTarget(target) : !isHeadingTarget(target);
    }));
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

  function resolveFontTargetsForScope(scope, role) {
    var range = getSelectionRangeInEditor();
    var targets = [];
    if (scope === 'card') targets = getCardFontTargets(range);
    else if (scope === 'block') targets = getBlockFontTargets(range);
    return filterTargetsByRole(targets, role);
  }

  function applyFont(fontIndex, role, scope) {
    var font = resolveFontOption(fontIndex, role);
    if (!font) return false;

    if (scope === 'page') {
      applyPageFont(font, role);
      showToast('\u5DF2\u5E94\u7528 ' + font.name + ' \u00B7 ' + getFontRoleLabel(role) + ' \u00B7 \u6574\u7BC7');
      return true;
    }

    var targets = resolveFontTargetsForScope(scope, role);
    if (!targets.length) {
      showToast('\u8BF7\u5148\u5C06\u5149\u6807\u653E\u5728\u8981\u4FEE\u6539\u7684' + getFontScopeLabel(scope) + '\u91CC', 2600);
      return false;
    }

    targets.forEach(function (target) {
      applyLocalFontToTarget(target, font);
    });
    showToast('\u5DF2\u5E94\u7528 ' + font.name + ' \u00B7 ' + getFontRoleLabel(role) + ' \u00B7 ' + getFontScopeLabel(scope));
    return true;
  }

  function resetFontOverrides(role, scope) {
    if (scope === 'page') {
      if (role === 'pair' || role === 'heading') pageFontState.heading = '';
      if (role === 'pair' || role === 'body') pageFontState.body = '';
      rebuildPageFontStyle();
      showToast('\u5DF2\u6062\u590D ' + getFontRoleLabel(role) + ' \u00B7 \u6574\u7BC7');
      return;
    }

    var targets = resolveFontTargetsForScope(scope, role);
    if (!targets.length) {
      showToast('\u6CA1\u627E\u5230\u53EF\u6062\u590D\u7684' + getFontScopeLabel(scope), 2600);
      return;
    }

    targets.forEach(function (target) {
      clearLocalFontFromTarget(target);
    });
    showToast('\u5DF2\u6062\u590D ' + getFontRoleLabel(role) + ' \u00B7 ' + getFontScopeLabel(scope));
  }

  function resetAllFontOverrides() {
    pageFontState.heading = '';
    pageFontState.body = '';
    rebuildPageFontStyle();

    editorEl.querySelectorAll('[data-tp-font-local]').forEach(function (target) {
      clearLocalFontFromTarget(target);
    });

    syncFontSelectState('0');
    showToast('\u5DF2\u590D\u539F\u5168\u90E8\u5B57\u4F53\u8BBE\u7F6E');
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
    document.addEventListener('selectionchange', function () {
      var sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      var range = sel.getRangeAt(0);
      if (!editorEl.contains(range.commonAncestorContainer)) return;
      savedRange = range.cloneRange();
    });
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
    if (dynamicFont) { var s = document.createElement('style'); s.id = 'tianphoto-dynamic-font'; s.textContent = dynamicFont.textContent; clone.querySelector('head').appendChild(s); }
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
    showToast('\u6B63\u5728\u51C6\u5907\u5BFC\u51FA...');
    try {
      // 渲染
      var canvas = await renderToCanvas();

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
      var message = err && err.message ? err.message : String(err);
      showToast('\u5BFC\u51FA\u5931\u8D25\uFF1A' + message, 5000);
    } finally {
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
      return '\u5355\u5F20\u5B8C\u6574\u56FE\u7247 \u00B7 ' + activeItem.width + 'x' + activeItem.height + 'px' + (currentPreviewScaleMode === 'actual' ? ' \u00B7 \u53EF\u62D6\u52A8\u67E5\u770B' : '');
    }
    return '\u5F53\u524D\u9884\u89C8 ' + (currentPreviewIndex + 1) + '/' + itemCount + ' \u00B7 ' + activeItem.width + 'x' + activeItem.height + 'px' + (currentPreviewScaleMode === 'actual' ? ' \u00B7 \u53EF\u62D6\u52A8\u67E5\u770B' : '');
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
