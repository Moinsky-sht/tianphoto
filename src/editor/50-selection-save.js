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

  function focusEditableNode(target) {
    if (!target) return;
    target.focus();
    var range = document.createRange();
    range.selectNodeContents(target);
    range.collapse(true);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    captureSelection();
  }

  function insertPlainTextContent(text) {
    var normalized = String(text || '')
      .replace(/\r\n?/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/[ \u00a0]+\n/g, '\n')
      .replace(/\n+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (!normalized) return false;

    restoreSelection();
    editorEl.focus();
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    var range = sel.getRangeAt(0);
    if (!editorEl.contains(range.commonAncestorContainer)) return false;
    range.deleteContents();
    var textNode = document.createTextNode(normalized);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    captureSelection();
    return true;
  }

  function getClosestEditableTextBlock(node) {
    var element = node && node.nodeType === 1 ? node : node && node.parentElement;
    if (!element || !element.closest) return null;
    return element.closest('p, h1, h2, h3, h4, li, blockquote, .wx-lead, .wx-eyebrow, .wx-metric-card strong, .wx-compare-card h3, .wx-timeline-item h3, .wx-quote-card small, figcaption');
  }

  function createNormalizedBlockAfter(currentBlock) {
    if (!currentBlock) return null;
    var tagName = currentBlock.tagName ? currentBlock.tagName.toLowerCase() : 'p';
    var nextNode;

    if (tagName === 'li') {
      nextNode = document.createElement('li');
    } else if (tagName === 'p' || tagName === 'figcaption') {
      nextNode = document.createElement(tagName);
    } else {
      nextNode = document.createElement('p');
    }

    if (currentBlock.classList && currentBlock.classList.contains('wx-lead')) {
      nextNode.className = 'wx-lead';
    }
    nextNode.setAttribute('contenteditable', 'true');
    nextNode.appendChild(document.createElement('br'));
    currentBlock.parentNode.insertBefore(nextNode, currentBlock.nextSibling);
    return nextNode;
  }

  function handleNormalizedEnter() {
    var range = getSelectionRangeInEditor();
    var anchor = getRangeAnchorElement(range);
    var currentBlock = getClosestEditableTextBlock(anchor);
    if (!currentBlock || !editorEl.contains(currentBlock) || !currentBlock.parentNode) return false;
    if (currentBlock.closest('.wx-section-mark')) return false;
    if (currentBlock.closest('td, th')) return false;

    prepareHistoryMutation();
    var nextNode = createNormalizedBlockAfter(currentBlock);
    if (!nextNode) return false;
    focusEditableNode(nextNode);
    pushHistorySnapshot('normalized-enter', true);
    return true;
  }

  function syncEmptyEditableState(root) {
    var scope = root && root.querySelectorAll ? root : editorEl;
    if (!scope || !scope.querySelectorAll) return;
    scope.querySelectorAll('[contenteditable="true"]').forEach(function (el) {
      var text = (el.textContent || '').replace(/\u200b/g, '').trim();
      if (!text) el.setAttribute('data-placeholder-empty', 'true');
      else el.removeAttribute('data-placeholder-empty');
    });
  }

  /* ═══ 事件 ═══ */

  function bindEvents() {
    editorEl.addEventListener('mouseup', captureSelection);
    editorEl.addEventListener('keyup', captureSelection);
    syncEmptyEditableState();
    editorEl.querySelectorAll('.wx-media-frame').forEach(function (frame) {
      ensureImageFrameHandle(frame);
    });
    editorEl.addEventListener('click', function (e) {
      var frame = e.target.closest && e.target.closest('.wx-media-frame');
      if (frame && editorEl.contains(frame)) {
        selectImageFrame(frame);
        return;
      }
      var editableBlock = getClosestEditableTextBlock(e.target);
      if (editableBlock && editableBlock.hasAttribute('contenteditable')) {
        syncEmptyEditableState(editableBlock);
      }
      if (!e.target.closest || !e.target.closest('.editor-toolbar')) {
        clearSelectedImageFrame();
      }
    });
    editorEl.addEventListener('pointerdown', function (e) {
      var handle = e.target.closest && e.target.closest('.wx-media-resize-handle');
      if (!handle) return;
      var frame = handle.closest('.wx-media-frame');
      if (!frame || !editorEl.contains(frame)) return;
      startImageResize(frame, e);
    });
    document.addEventListener('pointermove', function (e) {
      if (!imageResizeState) return;
      updateImageResize(e);
    });
    document.addEventListener('pointerup', function () {
      if (!imageResizeState) return;
      finishImageResize();
    });
    document.addEventListener('pointercancel', function () {
      if (!imageResizeState) return;
      finishImageResize();
    });
    editorEl.addEventListener('dblclick', function (e) {
      var frame = e.target.closest && e.target.closest('.wx-media-frame');
      if (!frame || !editorEl.contains(frame)) return;
      selectImageFrame(frame);
      prepareHistoryMutation();
      setImageFrameWidth(frame, 100);
      pushHistorySnapshot('image-reset', true);
      showToast('\u56FE\u7247\u5DF2\u6062\u590D\u6EE1\u5BBD');
    });
    editorEl.addEventListener('input', function () {
      syncEmptyEditableState();
      captureSelection();
      scheduleHistorySnapshot('input');
    });
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
      var clipboardData = e.clipboardData || e.originalEvent.clipboardData;
      if (!clipboardData) return;
      var items = clipboardData.items || [];
      var hasImg = false;
      for (var i = 0; i < items.length; i++) { if (items[i].type.indexOf('image') !== -1) { hasImg = true; break; } }
      if (hasImg) {
        e.preventDefault();
        var files = [];
        for (var j = 0; j < items.length; j++) {
          if (items[j].type.indexOf('image') !== -1) files.push(items[j].getAsFile());
        }
        handleImageFiles(files);
        return;
      }
      var text = clipboardData.getData('text/plain');
      if (!text) return;
      e.preventDefault();
      prepareHistoryMutation();
      if (insertPlainTextContent(text)) {
        pushHistorySnapshot('paste-plain-text', true);
        showToast('\u7C98\u8D34\u5185\u5BB9\u5DF2\u51C0\u5316\u4E3A\u7EAF\u6587\u672C', 2200);
      }
    });
    document.addEventListener('click', function (e) {
      if (!insertPanel || !insertPanel.classList.contains('is-visible')) return;
      if (insertPanel.contains(e.target)) return;
      if (toolbar && e.target.closest && e.target.closest('[data-command="toggleInsertPanel"]')) return;
      hideInsertPanel();
    });
    document.addEventListener('keydown', function (e) {
      var key = (e.key || '').toLowerCase();
      if (key === 'escape') {
        hideInsertPanel();
        return;
      }
      if (key === 'enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (handleNormalizedEnter()) {
          e.preventDefault();
          return;
        }
      }
      if (e.metaKey || e.ctrlKey) {
        if (!e.shiftKey && key === 's') {
          e.preventDefault();
          saveHtml();
          return;
        }
        if (!e.altKey && key === 'z') {
          e.preventDefault();
          if (e.shiftKey) redoHistory();
          else undoHistory();
          return;
        }
        if (!e.metaKey && e.ctrlKey && key === 'y') {
          e.preventDefault();
          redoHistory();
        }
      }
    });
  }

  /* ═══ 保存 HTML ═══ */

  function saveHtml() {
    var clone = document.documentElement.cloneNode(true);
    clone.querySelectorAll('.editor-toolbar, .editor-insert-panel, .export-overlay, .editor-toast, .tp-template-registry').forEach(function (el) { el.parentNode.removeChild(el); });
    var container = clone.querySelector('.article-container');
    if (container) container.removeAttribute('contenteditable');
    clone.querySelectorAll('.article-container [contenteditable]').forEach(function (el) { el.removeAttribute('contenteditable'); });
    clone.querySelectorAll('.wx-media-frame.is-selected').forEach(function (el) { el.classList.remove('is-selected'); });
    clone.querySelectorAll('.wx-media-frame[data-image-resizing]').forEach(function (el) { el.removeAttribute('data-image-resizing'); });
    clone.querySelectorAll('.wx-media-resize-handle').forEach(function (el) { el.parentNode.removeChild(el); });
    clone.querySelectorAll('[data-placeholder-empty="true"]').forEach(function (el) { el.removeAttribute('data-placeholder-empty'); });
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
