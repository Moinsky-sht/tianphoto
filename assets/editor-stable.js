/**
 * editor-stable.js — Tianphoto 稳定版内置编辑器 v2.0
 * 自包含 IIFE，零外部依赖（html2canvas 通过 window.html2canvas 引用）
 * 功能：文字编辑、图片插入、格式工具栏、字体选择器、PNG 导出切片、HTML 保存
 * 改进：固定宽度 375px、字体编辑、更稳定的初始化
 */
(function () {
  'use strict';

  // 配置常量
  var MOBILE_WIDTH = 375;
  var EXPORT_WIDTH = 1080;
  
  // 字体选项
  var FONT_OPTIONS = [
    { name: '系统默认', heading: '"Songti SC", "STSong", serif', body: '"Avenir Next", "PingFang SC", "Hiragino Sans GB", sans-serif' },
    { name: '优雅宋体', heading: '"Songti SC", "STSong", "SimSun", serif', body: '"PingFang SC", "Microsoft YaHei", sans-serif' },
    { name: '现代黑体', heading: '"PingFang SC", "Hiragino Sans GB", sans-serif', body: '"PingFang SC", "Microsoft YaHei", sans-serif' },
    { name: '手写风格', heading: '"Hanzi Pen SC", "STXingkai", cursive', body: '"PingFang SC", sans-serif' },
    { name: '商务正式', heading: '"Times New Roman", "Songti SC", serif', body: '"Segoe UI", "PingFang SC", sans-serif' },
    { name: '科技感', heading: '"SF Pro Display", "Helvetica Neue", sans-serif', body: '"SF Pro Text", "PingFang SC", sans-serif' },
    { name: '📝 自定义字体...', heading: 'custom', body: 'custom' }
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
    // 等待 DOM 就绪
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

    // 强制设置宽度
    enforceFixedWidth();
    
    // 创建编辑器 UI
    createToolbar();
    createExportOverlay();
    createExportDialog();
    
    // 启用编辑
    enableEditing();
    
    // 绑定事件
    bindEvents();
    
    console.log('[Tianphoto] Editor initialized, width: ' + MOBILE_WIDTH + 'px');
    showToast('编辑器已就绪，点击文字即可编辑');
  }

  function enforceFixedWidth() {
    // 强制固定容器宽度
    editorEl.style.width = MOBILE_WIDTH + 'px';
    editorEl.style.maxWidth = MOBILE_WIDTH + 'px';
    editorEl.style.margin = '0 auto';
    editorEl.style.boxSizing = 'border-box';
    editorEl.setAttribute('data-mobile-width', MOBILE_WIDTH);
    
    // 防止响应式布局改变宽度
    window.addEventListener('resize', function() {
      if (editorEl.offsetWidth !== MOBILE_WIDTH) {
        editorEl.style.width = MOBILE_WIDTH + 'px';
      }
    });
  }

  // ─── UI 创建 ───

  function createToolbar() {
    toolbar = document.createElement('div');
    toolbar.className = 'editor-toolbar';
    toolbar.innerHTML = 
      '<div class="editor-toolbar-inner">' +
        '<div class="editor-toolbar-group">' +
          '<button type="button" data-cmd="bold" title="加粗"><b>B</b></button>' +
          '<button type="button" data-cmd="italic" title="斜体"><i>I</i></button>' +
          '<button type="button" data-cmd="underline" title="下划线"><u>U</u></button>' +
        '</div>' +
        '<div class="editor-toolbar-divider"></div>' +
        '<div class="editor-toolbar-group">' +
          '<button type="button" data-cmd="justifyLeft" title="左对齐">◀</button>' +
          '<button type="button" data-cmd="justifyCenter" title="居中">◆</button>' +
          '<button type="button" data-cmd="justifyRight" title="右对齐">▶</button>' +
        '</div>' +
        '<div class="editor-toolbar-divider"></div>' +
        '<div class="editor-toolbar-group">' +
          '<select class="editor-font-select" title="选择字体">' +
            FONT_OPTIONS.map(function(f, i) {
              return '<option value="' + i + '">' + f.name + '</option>';
            }).join('') +
          '</select>' +
        '</div>' +
        '<div class="editor-toolbar-divider"></div>' +
        '<div class="editor-toolbar-group">' +
          '<button type="button" class="editor-btn-image" title="插入图片">🖼️ 图片</button>' +
          '<button type="button" class="editor-btn-save" title="保存 HTML">💾 保存</button>' +
          '<button type="button" class="editor-btn-export" title="导出 PNG">📤 导出</button>' +
        '</div>' +
      '</div>';
    
    document.body.appendChild(toolbar);
    
    // 字体选择器事件
    var fontSelect = toolbar.querySelector('.editor-font-select');
    fontSelect.addEventListener('change', function(e) {
      applyFont(parseInt(e.target.value));
    });
    
    // 格式按钮事件
    toolbar.querySelectorAll('button[data-cmd]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var cmd = this.getAttribute('data-cmd');
        document.execCommand(cmd, false, null);
        editorEl.focus();
      });
    });
    
    // 图片按钮
    toolbar.querySelector('.editor-btn-image').addEventListener('click', openImagePicker);
    
    // 保存按钮
    toolbar.querySelector('.editor-btn-save').addEventListener('click', saveHtml);
    
    // 导出按钮
    toolbar.querySelector('.editor-btn-export').addEventListener('click', exportPage);
  }

  function createExportOverlay() {
    overlay = document.createElement('div');
    overlay.className = 'export-overlay';
    overlay.style.display = 'none';
    overlay.innerHTML = 
      '<div class="export-overlay-inner">' +
        '<div class="export-spinner"></div>' +
        '<div class="export-text">正在生成图片...</div>' +
      '</div>';
    document.body.appendChild(overlay);
  }

  function createExportDialog() {
    dialog = document.createElement('div');
    dialog.className = 'export-dialog';
    dialog.style.display = 'none';
    dialog.innerHTML = 
      '<div class="export-dialog-inner">' +
        '<div class="export-header">' +
          '<h3>导出预览</h3>' +
          '<button type="button" class="export-close">&times;</button>' +
        '</div>' +
        '<div class="export-gallery"></div>' +
        '<div class="export-actions">' +
          '<button type="button" class="export-btn-download">下载全部</button>' +
          '<button type="button" class="export-btn-close">关闭</button>' +
        '</div>' +
      '</div>';
    
    document.body.appendChild(dialog);
    
    dialog.querySelector('.export-close').addEventListener('click', hideExportDialog);
    dialog.querySelector('.export-btn-close').addEventListener('click', hideExportDialog);
    dialog.querySelector('.export-btn-download').addEventListener('click', downloadAllSlices);
  }

  // ─── 编辑功能 ───

  function enableEditing() {
    editorEl.setAttribute('contenteditable', 'true');
    editorEl.setAttribute('spellcheck', 'false');
    
    // 为所有子元素添加 contenteditable
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
    
    // 处理自定义字体
    if (font.heading === 'custom' && font.body === 'custom') {
      var customHeading = prompt('请输入标题字体（CSS font-family 格式）：\n例如："PingFang SC", "Microsoft YaHei", sans-serif', '"PingFang SC", sans-serif');
      if (!customHeading) return;
      
      var customBody = prompt('请输入正文字体（CSS font-family 格式）：\n例如："PingFang SC", "Microsoft YaHei", sans-serif', '"PingFang SC", sans-serif');
      if (!customBody) return;
      
      font = {
        name: '自定义字体',
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
    
    showToast('已应用字体：' + font.name);
    
    // 保存自定义字体到本地存储
    if (font.name === '自定义字体') {
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
    input.onchange = function(e) {
      if (e.target.files && e.target.files.length > 0) {
        handleImageFiles(e.target.files);
      }
    };
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
      '<img src="' + dataUrl + '" alt="插图" class="polished-image" style="max-width:100%;height:auto;" />' +
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
    showToast('图片插入完成');
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
    // 选区变化时保存
    document.addEventListener('selectionchange', function() {
      if (document.activeElement && editorEl.contains(document.activeElement)) {
        captureSelection();
      }
    });

    // 拖拽图片
    editorEl.addEventListener('dragover', function(e) {
      e.preventDefault();
      editorEl.classList.add('drag-over');
    });

    editorEl.addEventListener('dragleave', function() {
      editorEl.classList.remove('drag-over');
    });

    editorEl.addEventListener('drop', function(e) {
      e.preventDefault();
      editorEl.classList.remove('drag-over');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleImageFiles(e.dataTransfer.files);
      }
    });

    // 点击外部关闭工具栏编辑状态
    document.addEventListener('click', function(e) {
      if (!toolbar.contains(e.target) && !editorEl.contains(e.target)) {
        // 可选：点击外部时保存选区
      }
    });

    // Cmd+S 保存
    document.addEventListener('keydown', function(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveHtml();
      }
    });
  }

  // ─── 保存 HTML ───

  function saveHtml() {
    var clone = document.documentElement.cloneNode(true);

    // 移除编辑器 UI
    var uiSelectors = '.editor-toolbar, .export-overlay, .export-dialog, .editor-toast';
    clone.querySelectorAll(uiSelectors).forEach(function(el) {
      el.parentNode.removeChild(el);
    });

    // 移除 contenteditable
    clone.querySelectorAll('[contenteditable]').forEach(function(el) {
      el.removeAttribute('contenteditable');
      el.removeAttribute('spellcheck');
    });

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
    
    setTimeout(function() { URL.revokeObjectURL(url); }, 5000);
    showToast('✅ 文件已保存: ' + filename);
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
    toast._timer = setTimeout(function() {
      toast.classList.remove('is-visible');
    }, duration || 2000);
  }

  // ─── 导出功能 ───

  function showExportOverlay() {
    overlay.style.display = 'flex';
  }

  function hideExportOverlay() {
    overlay.style.display = 'none';
  }

  function showExportDialog() {
    dialog.style.display = 'flex';
  }

  function hideExportDialog() {
    dialog.style.display = 'none';
  }

  async function exportPage() {
    if (isExporting) return;
    isExporting = true;
    showExportOverlay();
    showToast('正在生成切图，请稍候...', 15000);

    try {
      // 使用 html2canvas 导出
      if (typeof window.html2canvas !== 'function') {
        throw new Error('html2canvas 未加载');
      }

      // 创建导出容器
      var exportDiv = document.createElement('div');
      exportDiv.className = 'export-surface';
      exportDiv.style.cssText = 
        'position:fixed;left:-9999px;top:0;' +
        'width:' + MOBILE_WIDTH + 'px;' +
        'background:' + getComputedStyle(editorEl).background + ';';
      
      // 克隆内容
      var content = editorEl.cloneNode(true);
      
      // 清理编辑器属性
      content.removeAttribute('contenteditable');
      content.removeAttribute('spellcheck');
      content.querySelectorAll('[contenteditable]').forEach(function(el) {
        el.removeAttribute('contenteditable');
      });
      
      exportDiv.appendChild(content);
      document.body.appendChild(exportDiv);

      // 等待渲染
      await new Promise(function(r) { requestAnimationFrame(r); });
      await new Promise(function(r) { setTimeout(r, 500); });

      // 渲染 canvas
      var canvas = await window.html2canvas(exportDiv, {
        backgroundColor: null,
        height: exportDiv.scrollHeight,
        width: MOBILE_WIDTH,
        scale: 2.88, // 375 * 2.88 ≈ 1080
        useCORS: true,
        logging: false
      });

      // 计算切片
      var maxSliceHeight = 4000; // 最大切片高度
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
          filename: '切片-' + (slices.length + 1) + '.png',
          width: Math.round(canvas.width / 2.88),
          height: Math.round(h / 2.88),
          index: slices.length + 1
        });
        
        y += h;
      }

      exportSlices = slices;
      
      // 清理
      document.body.removeChild(exportDiv);
      
      // 显示结果
      hideExportOverlay();
      showExportPreview(slices);
      showToast('✅ 导出完成，共 ' + slices.length + ' 张');
      
    } catch (err) {
      console.error('Export error:', err);
      hideExportOverlay();
      showToast('❌ 导出失败: ' + err.message, 4000);
    } finally {
      isExporting = false;
    }
  }

  function showExportPreview(slices) {
    var gallery = dialog.querySelector('.export-gallery');
    gallery.innerHTML = '';
    
    slices.forEach(function(slice, idx) {
      var card = document.createElement('div');
      card.className = 'export-slice-card';
      card.innerHTML = 
        '<img src="' + slice.dataUrl + '" alt="切片 ' + slice.index + '">' +
        '<div class="export-slice-info">' +
          '切片 ' + slice.index + ' · ' + slice.width + 'x' + slice.height + 'px' +
        '</div>';
      
      card.addEventListener('click', function() {
        downloadSlice(slice);
      });
      
      gallery.appendChild(card);
    });
    
    showExportDialog();
  }

  function downloadSlice(slice) {
    var link = document.createElement('a');
    link.download = slice.filename;
    link.href = slice.dataUrl;
    link.click();
    showToast('已下载: ' + slice.filename);
  }

  function downloadAllSlices() {
    exportSlices.forEach(function(slice, idx) {
      setTimeout(function() {
        downloadSlice(slice);
      }, idx * 200);
    });
    showToast('开始下载 ' + exportSlices.length + ' 张图片...');
  }

  // ─── 启动 ───
  init();

})();
