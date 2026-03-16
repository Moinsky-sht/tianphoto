/**
 * editor-stable.js — Tianphoto 内置编辑器 v4.0
 * 自包含 IIFE，零外部依赖（html2canvas 通过 window.html2canvas 引用）
 *
 * v4.0 重点改进：
 *  - 导出引擎全面重写：CSS 变量预解析、backdrop-filter 降级、渐变文字降级
 *  - 支持切片导出 + 单图导出，可在预览弹窗中切换
 *  - 预览弹窗完全重设计：模式切换、进度条、缩略图、逐张/全部下载
 *  - 导出宽度固定 1080px，scale=2 高清，所见即所得
 */
(function () {
  'use strict';

  /* ═══ 常量 ═══ */
  var MOBILE_WIDTH = 375;
  var EXPORT_WIDTH = 1080;
  var EXPORT_SCALE = EXPORT_WIDTH / MOBILE_WIDTH; // 2.88

  var FONT_OPTIONS = [
    { name: '\u7CFB\u7EDF\u9ED8\u8BA4', heading: '"Songti SC", "STSong", serif', body: '"Avenir Next", "PingFang SC", "Hiragino Sans GB", sans-serif' },
    { name: '\u4F18\u96C5\u5B8B\u4F53', heading: '"Songti SC", "STSong", "SimSun", serif', body: '"PingFang SC", "Microsoft YaHei", sans-serif' },
    { name: '\u73B0\u4EE3\u9ED1\u4F53', heading: '"PingFang SC", "Hiragino Sans GB", sans-serif', body: '"PingFang SC", "Microsoft YaHei", sans-serif' },
    { name: '\u624B\u5199\u98CE\u683C', heading: '"Hanzi Pen SC", "STXingkai", cursive', body: '"PingFang SC", sans-serif' },
    { name: '\u5546\u52A1\u6B63\u5F0F', heading: '"Times New Roman", "Songti SC", serif', body: '"Segoe UI", "PingFang SC", sans-serif' },
    { name: '\u79D1\u6280\u611F', heading: '"SF Pro Display", "Helvetica Neue", sans-serif', body: '"SF Pro Text", "PingFang SC", sans-serif' },
    { name: '\u81EA\u5B9A\u4E49\u5B57\u4F53...', heading: 'custom', body: 'custom' }
  ];

  /* ═══ 状态 ═══ */
  var savedRange = null;
  var exportSlices = [];
  var exportFullImage = null;
  var isExporting = false;
  var currentExportMode = 'slices'; // 'slices' | 'full'

  var editorEl = null;
  var toolbar = null;
  var overlay = null;
  var dialog = null;
  var toast = null;
  var progressBar = null;

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
    console.log('[Tianphoto] Editor v4.0 ready');
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
      '<button data-command="insertImage" title="\u63D2\u5165\u56FE\u7247"><svg viewBox="0 0 20 20" width="18" height="18"><rect x="2" y="3" width="16" height="14" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="7" cy="8" r="2" fill="currentColor"/><path d="M2 14l4-4 3 3 4-5 5 6H2z" fill="currentColor" opacity=".6"/></svg></button>' +
      '<span class="toolbar-sep"></span>' +
      '<select class="editor-font-select" title="\u9009\u62E9\u5B57\u4F53">' +
        FONT_OPTIONS.map(function (f, i) { return '<option value="' + i + '">' + f.name + '</option>'; }).join('') +
      '</select>';

    var rightGroup = document.createElement('div');
    rightGroup.className = 'toolbar-group';
    rightGroup.innerHTML =
      '<button data-command="save" class="toolbar-save" title="\u4FDD\u5B58\u7F51\u9875\u6587\u4EF6"><svg viewBox="0 0 20 20" width="16" height="16"><path d="M3 3h11l3 3v11a1 1 0 01-1 1H4a1 1 0 01-1-1V3zm3 0v5h7V3zm1 9a2 2 0 104 0 2 2 0 00-4 0z" fill="currentColor"/></svg> \u4FDD\u5B58</button>' +
      '<button data-command="export" class="toolbar-export" title="\u5BFC\u51FA PNG"><svg viewBox="0 0 20 20" width="16" height="16"><path d="M10 3v9m0 0l-3-3m3 3l3-3M4 14v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg> \u5BFC\u51FA</button>';

    toolbar.appendChild(leftGroup);
    toolbar.appendChild(rightGroup);

    toolbar.querySelector('.editor-font-select').addEventListener('change', function (e) {
      applyFont(parseInt(e.target.value));
    });

    toolbar.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-command]');
      if (!btn) return;
      var cmd = btn.dataset.command;
      var val = btn.dataset.value;
      if (cmd === 'export') { exportPage(); return; }
      if (cmd === 'save') { saveHtml(); return; }
      if (cmd === 'insertImage') { openImagePicker(); return; }
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
        '<div class="export-mode-switch">' +
          '<button class="export-mode-btn is-active" data-mode="slices">\u5207\u7247</button>' +
          '<button class="export-mode-btn" data-mode="full">\u5355\u56FE</button>' +
        '</div>' +
      '</div>' +
      '<div class="export-progress" style="display:none;">' +
        '<div class="export-progress-bar"><div class="export-progress-fill"></div></div>' +
        '<div class="export-progress-text">\u6B63\u5728\u751F\u6210...</div>' +
      '</div>' +
      '<div class="export-gallery"></div>' +
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
        dialog.querySelectorAll('.export-mode-btn').forEach(function (b) { b.classList.remove('is-active'); });
        this.classList.add('is-active');
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

  function showExportModal() { overlay.classList.add('is-visible'); }
  function hideExportModal() { overlay.classList.remove('is-visible'); }

  function setProgress(pct, text) {
    progressBar.style.display = '';
    progressBar.querySelector('.export-progress-fill').style.width = pct + '%';
    if (text) progressBar.querySelector('.export-progress-text').textContent = text;
  }
  function hideProgress() { progressBar.style.display = 'none'; }

  /* ═══ 编辑 ═══ */

  function enableEditing() {
    editorEl.setAttribute('contenteditable', 'true');
    editorEl.setAttribute('spellcheck', 'false');
    editorEl.querySelectorAll('h1, h2, h3, h4, p, li, td, th, .wx-lead, .wx-eyebrow, strong, small').forEach(function (el) {
      if (!el.hasAttribute('contenteditable')) el.setAttribute('contenteditable', 'true');
    });
  }

  function applyFont(fontIndex) {
    var font = FONT_OPTIONS[fontIndex];
    if (!font) return;
    if (font.heading === 'custom' && font.body === 'custom') {
      var customHeading = prompt('\u8BF7\u8F93\u5165\u6807\u9898\u5B57\u4F53\uFF08CSS font-family\uFF09', '"PingFang SC", sans-serif');
      if (!customHeading) return;
      var customBody = prompt('\u8BF7\u8F93\u5165\u6B63\u6587\u5B57\u4F53\uFF08CSS font-family\uFF09', '"PingFang SC", sans-serif');
      if (!customBody) return;
      font = { name: '\u81EA\u5B9A\u4E49', heading: customHeading, body: customBody };
    }
    var style = document.getElementById('tianphoto-dynamic-font');
    if (!style) { style = document.createElement('style'); style.id = 'tianphoto-dynamic-font'; document.head.appendChild(style); }
    style.textContent =
      '.article-container h1,.article-container h2,.article-container h3,.article-container h4{font-family:' + font.heading + ' !important;}' +
      '.article-container,.article-container p,.article-container li{font-family:' + font.body + ' !important;}';
    showToast('\u5DF2\u5E94\u7528\u5B57\u4F53\uFF1A' + font.name);
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
     导出引擎 v4.0 — 所见即所得
     ═══════════════════════════════════════════════════ */

  /**
   * 收集页面上所有 :root CSS 变量的计算值，返回 { name: computedValue } 对象。
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
   * 在 clone 的 DOM 树上做 html2canvas 兼容处理：
   * 1) 将所有 var(--xxx) 内联替换为计算值
   * 2) 将 backdrop-filter 元素加不透明兜底背景
   * 3) 将 -webkit-background-clip:text 渐变文字降级为纯色
   * 4) 将 SVG 中的 var() 替换为计算值
   */
  function patchForExport(root, vars) {
    // 1) 替换 SVG 中的 var() 引用
    root.querySelectorAll('svg').forEach(function (svg) {
      svg.innerHTML = svg.innerHTML.replace(/var\(\s*(--[\w-]+)\s*\)/g, function (match, name) {
        return vars[name] || match;
      });
    });

    // 2) 将所有元素的 inline style 中的 var() 替换
    root.querySelectorAll('*').forEach(function (el) {
      if (el.style && el.style.cssText) {
        var patched = el.style.cssText.replace(/var\(\s*(--[\w-]+)(?:\s*,\s*([^)]+))?\s*\)/g, function (match, name, fallback) {
          return vars[name] || fallback || match;
        });
        if (patched !== el.style.cssText) el.style.cssText = patched;
      }
    });

    // 3) 处理 backdrop-filter → 不透明兜底
    root.querySelectorAll('*').forEach(function (el) {
      var cs = getComputedStyle(el);
      var bf = cs.getPropertyValue('backdrop-filter') || cs.getPropertyValue('-webkit-backdrop-filter');
      if (bf && bf !== 'none') {
        var bg = cs.backgroundColor;
        // 如果背景是半透明的，增加不透明度
        if (bg && /rgba/.test(bg)) {
          var opaqueBg = bg.replace(/,\s*[\d.]+\)$/, ', 0.95)');
          el.style.backgroundColor = opaqueBg;
        }
        el.style.backdropFilter = 'none';
        el.style.webkitBackdropFilter = 'none';
      }
    });

    // 4) 处理 -webkit-background-clip:text → 降级为纯色
    root.querySelectorAll('*').forEach(function (el) {
      var cs = getComputedStyle(el);
      var bgClip = cs.getPropertyValue('-webkit-background-clip') || cs.getPropertyValue('background-clip');
      if (bgClip === 'text') {
        el.style.backgroundClip = 'border-box';
        el.style.webkitBackgroundClip = 'border-box';
        el.style.webkitTextFillColor = 'unset';
        el.style.color = vars['--accent-strong'] || cs.color;
        el.style.backgroundImage = 'none';
      }
    });
  }

  /**
   * 将 :root CSS 变量注入到 export surface，使 html2canvas 能读取
   */
  function injectVarsToSurface(surface, vars) {
    var cssText = surface.style.cssText || '';
    Object.keys(vars).forEach(function (name) {
      cssText += name + ':' + vars[name] + ';';
    });
    surface.style.cssText = cssText;
  }

  /**
   * 创建导出用的离屏 DOM 容器，已做所有 html2canvas 兼容处理。
   * 返回 { surface, cleanup }
   */
  function createExportSurface() {
    var vars = collectCssVars();

    var surface = document.createElement('div');
    surface.className = 'export-surface';
    // 读取页面实际背景色
    var pageBg = getComputedStyle(document.body).backgroundColor;
    var containerBg = getComputedStyle(editorEl).backgroundColor;
    surface.style.cssText =
      'position:fixed;left:-9999px;top:0;' +
      'width:' + MOBILE_WIDTH + 'px;' +
      'overflow:hidden;' +
      'background:' + (containerBg !== 'rgba(0, 0, 0, 0)' ? containerBg : pageBg) + ';';

    injectVarsToSurface(surface, vars);

    // 克隆内容
    var content = editorEl.cloneNode(true);
    content.removeAttribute('contenteditable');
    content.removeAttribute('spellcheck');
    content.style.width = MOBILE_WIDTH + 'px';
    content.style.maxWidth = MOBILE_WIDTH + 'px';
    content.querySelectorAll('[contenteditable]').forEach(function (el) { el.removeAttribute('contenteditable'); });
    content.querySelectorAll('.editor-toolbar, .export-overlay, .editor-toast').forEach(function (el) { el.parentNode.removeChild(el); });

    // 关键：对 clone 做 html2canvas 兼容处理
    patchForExport(content, vars);

    surface.appendChild(content);
    document.body.appendChild(surface);

    return {
      surface: surface,
      cleanup: function () { document.body.removeChild(surface); }
    };
  }

  /**
   * 核心渲染：将 surface 渲染为 canvas
   */
  async function renderToCanvas(surface) {
    // 等待渲染稳定
    await new Promise(function (r) { requestAnimationFrame(r); });
    await new Promise(function (r) { setTimeout(r, 300); });
    // 再等字体
    if (document.fonts && document.fonts.ready) await document.fonts.ready;

    var canvas = await window.html2canvas(surface, {
      backgroundColor: null,
      width: MOBILE_WIDTH,
      height: surface.scrollHeight,
      scale: EXPORT_SCALE,
      useCORS: true,
      logging: false,
      // 关键：让 html2canvas 忽略这些 CSS 属性避免报错
      ignoreElements: function (el) {
        return el.classList && (el.classList.contains('editor-toolbar') || el.classList.contains('export-overlay') || el.classList.contains('editor-toast'));
      }
    });
    return canvas;
  }

  /**
   * 将 canvas 按智能边界切片
   */
  function sliceCanvas(canvas) {
    var MAX_SLICE_PX = 5000; // canvas 像素（对应 ~1740 逻辑像素）
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

    showExportModal();
    setProgress(10, '\u6B63\u5728\u51C6\u5907\u5BFC\u51FA...');
    dialog.querySelector('.export-gallery').innerHTML = '';
    dialog.querySelector('.export-info').textContent = '';

    try {
      if (typeof window.html2canvas !== 'function') throw new Error('html2canvas \u672A\u52A0\u8F7D');

      setProgress(20, '\u6B63\u5728\u5904\u7406 CSS \u53D8\u91CF...');
      var exp = createExportSurface();

      setProgress(40, '\u6B63\u5728\u6E32\u67D3\u56FE\u7247...');
      var canvas = await renderToCanvas(exp.surface);
      exp.cleanup();

      setProgress(70, '\u6B63\u5728\u5207\u7247...');

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

      setProgress(100, '\u5BFC\u51FA\u5B8C\u6210');
      setTimeout(function () { hideProgress(); }, 600);

      renderGallery();
      showToast('\u5BFC\u51FA\u5B8C\u6210');

    } catch (err) {
      console.error('Export error:', err);
      hideProgress();
      hideExportModal();
      showToast('\u5BFC\u51FA\u5931\u8D25\uFF1A' + (err.message || err), 4000);
    } finally {
      isExporting = false;
    }
  }

  /* ═══ 预览渲染 ═══ */

  function renderGallery() {
    var gallery = dialog.querySelector('.export-gallery');
    var info = dialog.querySelector('.export-info');
    var dlBtn = dialog.querySelector('.export-btn-download');
    gallery.innerHTML = '';

    if (currentExportMode === 'full' && exportFullImage) {
      // 单图模式
      var card = document.createElement('div');
      card.className = 'export-slice-card';
      card.innerHTML =
        '<img src="' + exportFullImage.dataUrl + '" alt="\u5B8C\u6574\u56FE\u7247">' +
        '<div class="export-slice-info">' + exportFullImage.width + ' x ' + exportFullImage.height + ' px</div>';
      card.addEventListener('click', function () { downloadFullImage(); });
      gallery.appendChild(card);
      info.textContent = '\u5355\u5F20\u5B8C\u6574\u56FE\u7247 \u00B7 ' + exportFullImage.width + 'x' + exportFullImage.height + 'px';
      dlBtn.textContent = '\u4E0B\u8F7D\u56FE\u7247';
    } else if (exportSlices.length > 0) {
      // 切片模式
      exportSlices.forEach(function (slice) {
        var card = document.createElement('div');
        card.className = 'export-slice-card';
        card.innerHTML =
          '<img src="' + slice.dataUrl + '" alt="\u5207\u7247 ' + slice.index + '">' +
          '<div class="export-slice-info">' +
            '\u5207\u7247 ' + slice.index + ' \u00B7 ' + slice.width + 'x' + slice.height + 'px' +
          '</div>';
        card.addEventListener('click', function () { downloadSlice(slice); });
        gallery.appendChild(card);
      });
      info.textContent = '\u5171 ' + exportSlices.length + ' \u5F20\u5207\u7247 \u00B7 \u70B9\u51FB\u5355\u5F20\u53EF\u5355\u72EC\u4E0B\u8F7D';
      dlBtn.textContent = '\u4E0B\u8F7D\u5168\u90E8 (' + exportSlices.length + ')';
    }
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
