/**
 * editor-stable.js — Tianphoto 内置编辑器 v3.0
 * 自包含 IIFE，零外部依赖（html2canvas 通过 window.html2canvas 引用）
 * 功能：文字编辑、图片插入、SVG 图标工具栏、字体选择器、PNG 导出切片、HTML 保存
 * v3.0：恢复 v1.7 精致 SVG 图标，移除所有 emoji，优化弹窗交互
 */
(function () {
  'use strict';

  // 配置常量
  var MOBILE_WIDTH = 375;
  var EXPORT_WIDTH = 1080;

  // 字体选项（无 emoji）
  var FONT_OPTIONS = [
    { name: '\u7CFB\u7EDF\u9ED8\u8BA4', heading: '"Songti SC", "STSong", serif', body: '"Avenir Next", "PingFang SC", "Hiragino Sans GB", sans-serif' },
    { name: '\u4F18\u96C5\u5B8B\u4F53', heading: '"Songti SC", "STSong", "SimSun", serif', body: '"PingFang SC", "Microsoft YaHei", sans-serif' },
    { name: '\u73B0\u4EE3\u9ED1\u4F53', heading: '"PingFang SC", "Hiragino Sans GB", sans-serif', body: '"PingFang SC", "Microsoft YaHei", sans-serif' },
    { name: '\u624B\u5199\u98CE\u683C', heading: '"Hanzi Pen SC", "STXingkai", cursive', body: '"PingFang SC", sans-serif' },
    { name: '\u5546\u52A1\u6B63\u5F0F', heading: '"Times New Roman", "Songti SC", serif', body: '"Segoe UI", "PingFang SC", sans-serif' },
    { name: '\u79D1\u6280\u611F', heading: '"SF Pro Display", "Helvetica Neue", sans-serif', body: '"SF Pro Text", "PingFang SC", sans-serif' },
    { name: '\u81EA\u5B9A\u4E49\u5B57\u4F53...', heading: 'custom', body: 'custom' }
  ];

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

  // ─── 初始化 ───

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

    console.log('[Tianphoto] Editor initialized, width: ' + MOBILE_WIDTH + 'px');
    showToast('\u7F16\u8F91\u5668\u5DF2\u5C31\u7EEA\uFF0C\u70B9\u51FB\u6587\u5B57\u5373\u53EF\u7F16\u8F91');
  }

  function enforceFixedWidth() {
    editorEl.style.width = MOBILE_WIDTH + 'px';
    editorEl.style.maxWidth = MOBILE_WIDTH + 'px';
    editorEl.style.margin = '0 auto';
    editorEl.style.boxSizing = 'border-box';
    editorEl.setAttribute('data-mobile-width', MOBILE_WIDTH);

    window.addEventListener('resize', function() {
      if (editorEl.offsetWidth !== MOBILE_WIDTH) {
        editorEl.style.width = MOBILE_WIDTH + 'px';
      }
    });
  }

  // ─── UI 创建（SVG 图标工具栏，恢复 v1.7 精致风格）───

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
        FONT_OPTIONS.map(function(f, i) {
          return '<option value="' + i + '">' + f.name + '</option>';
        }).join('') +
      '</select>';

    var rightGroup = document.createElement('div');
    rightGroup.className = 'toolbar-group';
    rightGroup.innerHTML =
      '<button data-command="save" class="toolbar-save" title="\u4FDD\u5B58\u7F51\u9875\u6587\u4EF6"><svg viewBox="0 0 20 20" width="16" height="16"><path d="M3 3h11l3 3v11a1 1 0 01-1 1H4a1 1 0 01-1-1V3zm3 0v5h7V3zm1 9a2 2 0 104 0 2 2 0 00-4 0z" fill="currentColor"/></svg> \u4FDD\u5B58</button>' +
      '<button data-command="export" class="toolbar-export" title="\u5BFC\u51FA PNG \u5207\u7247"><svg viewBox="0 0 20 20" width="16" height="16"><path d="M10 3v9m0 0l-3-3m3 3l3-3M4 14v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg> \u5BFC\u51FA</button>';

    toolbar.appendChild(leftGroup);
    toolbar.appendChild(rightGroup);

    // 字体选择器事件
    toolbar.querySelector('.editor-font-select').addEventListener('change', function(e) {
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
      downloadAllSlices();
    });
    dialog.querySelector('.export-btn-close').addEventListener('click', hideExportModal);

    overlay.appendChild(dialog);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) hideExportModal();
    });

    document.body.appendChild(overlay);
  }

  // ─── 编辑功能 ───

  function enableEditing() {
    editorEl.setAttribute('contenteditable', 'true');
    editorEl.setAttribute('spellcheck', 'false');

    var editables = editorEl.querySelectorAll('h1, h2, h3, h4, p, li, td, th, .wx-lead, .wx-eyebrow, strong, small');
    editables.forEach(function(el) {
      if (!el.hasAttribute('contenteditable')) {
        el.setAttribute('contenteditable', 'true');
      }
    });
  }

  function applyFont(fontIndex) {
    var font = FONT_OPTIONS[fontIndex];
    if (!font) return;

    if (font.heading === 'custom' && font.body === 'custom') {
      var customHeading = prompt('\u8BF7\u8F93\u5165\u6807\u9898\u5B57\u4F53\uFF08CSS font-family \u683C\u5F0F\uFF09\uFF1A\n\u4F8B\u5982\uFF1A"PingFang SC", "Microsoft YaHei", sans-serif', '"PingFang SC", sans-serif');
      if (!customHeading) return;

      var customBody = prompt('\u8BF7\u8F93\u5165\u6B63\u6587\u5B57\u4F53\uFF08CSS font-family \u683C\u5F0F\uFF09\uFF1A\n\u4F8B\u5982\uFF1A"PingFang SC", "Microsoft YaHei", sans-serif', '"PingFang SC", sans-serif');
      if (!customBody) return;

      font = {
        name: '\u81EA\u5B9A\u4E49\u5B57\u4F53',
        heading: customHeading,
        body: customBody
      };
    }

    var style = document.getElementById('tianphoto-dynamic-font');
    if (!style) {
      style = document.createElement('style');
      style.id = 'tianphoto-dynamic-font';
      document.head.appendChild(style);
    }

    style.textContent =
      '.article-container h1, .article-container h2, .article-container h3, .article-container h4 { font-family: ' + font.heading + ' !important; }' +
      '.article-container, .article-container p, .article-container li { font-family: ' + font.body + ' !important; }';

    showToast('\u5DF2\u5E94\u7528\u5B57\u4F53\uFF1A' + font.name);

    if (font.name === '\u81EA\u5B9A\u4E49\u5B57\u4F53') {
      try {
        localStorage.setItem('tianphoto-custom-font-heading', font.heading);
        localStorage.setItem('tianphoto-custom-font-body', font.body);
      } catch (e) {}
    }
  }

  // ─── 图片插入 ───

  function openImagePicker() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.addEventListener('change', function () {
      if (input.files && input.files.length) handleImageFiles(input.files);
    });
    input.click();
  }

  function fileToDataUrl(file) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function() { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function buildImageBlock(dataUrl) {
    return '<figure class="wx-media-frame">' +
      '<img src="' + dataUrl + '" alt="\u63D2\u56FE" class="polished-image" style="max-width:100%;height:auto;" />' +
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
      try {
        var dataUrl = await fileToDataUrl(files[i]);
        insertHtmlAtCursor(buildImageBlock(dataUrl));
      } catch (err) {
        console.error('Image load error:', err);
      }
    }
    showToast('\u56FE\u7247\u63D2\u5165\u5B8C\u6210');
  }

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

  // ─── 事件绑定 ───

  function bindEvents() {
    editorEl.addEventListener('mouseup', captureSelection);
    editorEl.addEventListener('keyup', captureSelection);

    editorEl.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      editorEl.classList.add('drag-over');
    });

    editorEl.addEventListener('dragleave', function () {
      editorEl.classList.remove('drag-over');
    });

    editorEl.addEventListener('drop', function (e) {
      e.preventDefault();
      editorEl.classList.remove('drag-over');
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

    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveHtml();
      }
    });
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

    // 保留动态字体样式
    var dynamicFont = document.getElementById('tianphoto-dynamic-font');
    if (dynamicFont) {
      var head = clone.querySelector('head');
      var preservedStyle = document.createElement('style');
      preservedStyle.textContent = dynamicFont.textContent;
      head.appendChild(preservedStyle);
    }

    var html = '<!DOCTYPE html>\n' + clone.outerHTML;
    var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    var url = URL.createObjectURL(blob);

    var filename = (document.title || 'article').replace(/[^\w\u4e00-\u9fff-]/g, '_') + '.html';

    var link = document.createElement('a');
    link.download = filename;
    link.href = url;
    link.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 5000);

    showToast('\u6587\u4EF6\u5DF2\u4FDD\u5B58');
  }

  // ─── 提示条 ───

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

  // ─── 导出功能 ───

  function showExportModal() {
    overlay.classList.add('is-visible');
  }

  function hideExportModal() {
    overlay.classList.remove('is-visible');
  }

  /**
   * 将 :root 上的 CSS 变量解析为计算后的实际颜色值，
   * 写入 export surface 的 inline style。
   */
  function resolveVarsToInline(surface) {
    var computed = getComputedStyle(document.documentElement);
    var varNames = [];
    for (var i = 0; i < document.styleSheets.length; i++) {
      try {
        var rules = document.styleSheets[i].cssRules || [];
        for (var j = 0; j < rules.length; j++) {
          if (rules[j].selectorText === ':root') {
            var txt = rules[j].cssText;
            var re = /--([\w-]+)/g;
            var m;
            while ((m = re.exec(txt)) !== null) varNames.push('--' + m[1]);
          }
        }
      } catch (e) {}
    }
    var inlineVars = '';
    varNames.forEach(function (v) {
      var val = computed.getPropertyValue(v).trim();
      if (val) inlineVars += v + ':' + val + ';';
    });
    if (inlineVars) surface.style.cssText += inlineVars;
  }

  async function exportPage() {
    if (isExporting) return;
    isExporting = true;
    showToast('\u6B63\u5728\u751F\u6210\u5207\u56FE\uFF0C\u8BF7\u7A0D\u5019...', 15000);

    try {
      if (typeof window.html2canvas !== 'function') {
        throw new Error('html2canvas \u672A\u52A0\u8F7D');
      }

      var exportDiv = document.createElement('div');
      exportDiv.className = 'export-surface';
      exportDiv.style.cssText =
        'position:fixed;left:-9999px;top:0;' +
        'width:' + MOBILE_WIDTH + 'px;' +
        'background:' + getComputedStyle(editorEl).background + ';';

      var content = editorEl.cloneNode(true);
      content.removeAttribute('contenteditable');
      content.removeAttribute('spellcheck');
      content.querySelectorAll('[contenteditable]').forEach(function(el) {
        el.removeAttribute('contenteditable');
      });

      // 清除编辑器 UI
      var uiEls = content.querySelectorAll('.editor-toolbar, .export-overlay, .editor-toast');
      for (var k = 0; k < uiEls.length; k++) uiEls[k].parentNode.removeChild(uiEls[k]);

      exportDiv.appendChild(content);
      document.body.appendChild(exportDiv);

      resolveVarsToInline(exportDiv);

      await new Promise(function(r) { requestAnimationFrame(r); });
      await new Promise(function(r) { setTimeout(r, 500); });

      var canvas = await window.html2canvas(exportDiv, {
        backgroundColor: null,
        height: exportDiv.scrollHeight,
        width: MOBILE_WIDTH,
        scale: 2.88,
        useCORS: true,
        logging: false
      });

      var maxSliceHeight = 4000;
      var slices = [];
      var totalHeight = canvas.height;
      var y = 0;

      while (y < totalHeight) {
        var h = Math.min(maxSliceHeight, totalHeight - y);
        var sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = h;

        var ctx = sliceCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);

        slices.push({
          dataUrl: sliceCanvas.toDataURL('image/png', 1),
          filename: '\u5207\u7247-' + (slices.length + 1) + '.png',
          width: Math.round(canvas.width / 2.88),
          height: Math.round(h / 2.88),
          index: slices.length + 1
        });

        y += h;
      }

      exportSlices = slices;
      document.body.removeChild(exportDiv);

      showExportPreview(slices);
      showToast('\u5BFC\u51FA\u5B8C\u6210\uFF0C\u5171 ' + slices.length + ' \u5F20');

    } catch (err) {
      console.error('Export error:', err);
      showToast('\u5BFC\u51FA\u5931\u8D25\uFF1A' + (err.message || err), 4000);
    } finally {
      isExporting = false;
    }
  }

  // ─── 导出弹窗 ───

  function showExportPreview(slices) {
    var gallery = dialog.querySelector('.export-gallery');
    gallery.innerHTML = '';

    slices.forEach(function (slice) {
      var card = document.createElement('div');
      card.className = 'export-slice-card';
      card.innerHTML =
        '<img src="' + slice.dataUrl + '" alt="\u5207\u7247 ' + slice.index + '">' +
        '<div class="export-slice-info">' +
          '\u5207\u7247 ' + slice.index + ' \u00B7 ' + slice.width + 'x' + slice.height + 'px' +
        '</div>';
      card.addEventListener('click', function () {
        downloadSlice(slice);
      });
      gallery.appendChild(card);
    });

    var countEl = dialog.querySelector('.export-count');
    if (countEl) countEl.textContent = '\u5171 ' + slices.length + ' \u5F20';

    showExportModal();
  }

  function downloadSlice(slice) {
    var link = document.createElement('a');
    link.download = slice.filename;
    link.href = slice.dataUrl;
    link.click();
    showToast('\u5DF2\u4E0B\u8F7D: ' + slice.filename);
  }

  function downloadAllSlices() {
    exportSlices.forEach(function (slice, idx) {
      setTimeout(function () {
        downloadSlice(slice);
      }, idx * 200);
    });
    showToast('\u5F00\u59CB\u4E0B\u8F7D ' + exportSlices.length + ' \u5F20\u56FE\u7247...');
  }

  // ─── 启动 ───
  init();

})();
