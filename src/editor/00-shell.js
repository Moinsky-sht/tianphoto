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
  var BLOCK_INSERT_SELECTORS = [
    '.wx-hero-card',
    '.wx-intro-card',
    '.wx-section-card',
    '.wx-metric-grid',
    '.wx-compare-grid',
    '.wx-timeline-card',
    '.wx-quote-card',
    '.wx-summary-card',
    '.wx-media-frame',
    '.wx-inline-graphic',
    '.wx-badge-art',
    'figure',
    'table'
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
  var exportArtifacts = { jpg: { slices: [], full: null }, png: { slices: [], full: null } };
  var isExporting = false;
  var currentExportMode = 'full'; // 'slices' | 'full'
  var currentExportFormat = 'jpg'; // 'jpg' | 'png'
  var currentPreviewIndex = 0;
  var currentPreviewScaleMode = 'actual'; // 'fit' | 'actual'

  var editorEl = null;
  var toolbar = null;
  var insertPanel = null;
  var overlay = null;
  var dialog = null;
  var toast = null;
  var progressBar = null;
  var selectedImageFrame = null;
  var imageResizeState = null;
  var historyEntries = [];
  var redoEntries = [];
  var historyIndex = -1;
  var historyTimer = null;
  var historyObserver = null;
  var historyRestoring = false;
  var HISTORY_LIMIT = 180;

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
    ensureTemplateRegistry();
    createToolbar();
    createInsertPanel();
    createExportModal();
    enableEditing();
    bindEvents();
    initHistory();
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
