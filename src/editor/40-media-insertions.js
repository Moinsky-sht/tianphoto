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
    return '' +
      '<figure class="wx-media-frame" data-image-width="100" style="width:100%;max-width:100%;">' +
        '<img src="' + dataUrl + '" alt="\u63D2\u56FE" class="polished-image" style="max-width:100%;height:auto;" />' +
        '<button type="button" class="wx-media-resize-handle" aria-label="\u62D6\u62FD\u8C03\u6574\u56FE\u7247\u5927\u5C0F" title="\u62D6\u62FD\u8C03\u6574\u56FE\u7247\u5927\u5C0F"></button>' +
      '</figure>';
  }

  function ensureImageFrameHandle(frame) {
    if (!frame) return;
    if (!frame.querySelector('.wx-media-resize-handle')) {
      var handle = document.createElement('button');
      handle.type = 'button';
      handle.className = 'wx-media-resize-handle';
      handle.setAttribute('aria-label', '\u62D6\u62FD\u8C03\u6574\u56FE\u7247\u5927\u5C0F');
      handle.setAttribute('title', '\u62D6\u62FD\u8C03\u6574\u56FE\u7247\u5927\u5C0F');
      frame.appendChild(handle);
    }
  }

  function clearSelectedImageFrame() {
    if (!selectedImageFrame) return;
    selectedImageFrame.classList.remove('is-selected');
    selectedImageFrame.removeAttribute('data-image-resizing');
    selectedImageFrame = null;
    updateImageToolButtons();
  }

  function selectImageFrame(frame) {
    if (!frame || frame === selectedImageFrame) {
      updateImageToolButtons();
      return;
    }
    clearSelectedImageFrame();
    ensureImageFrameHandle(frame);
    selectedImageFrame = frame;
    selectedImageFrame.classList.add('is-selected');
    updateImageToolButtons();
  }

  function getActiveImageFrame() {
    if (selectedImageFrame && editorEl.contains(selectedImageFrame)) return selectedImageFrame;
    var range = getSelectionRangeInEditor();
    var anchor = getRangeAnchorElement(range);
    if (anchor && anchor.closest) {
      var frame = anchor.closest('.wx-media-frame');
      if (frame && editorEl.contains(frame)) return frame;
    }
    return null;
  }

  function getImageFrameWidth(frame) {
    if (!frame) return 100;
    var stored = parseInt(frame.getAttribute('data-image-width') || '', 10);
    if (!Number.isNaN(stored)) return stored;
    return 100;
  }

  function setImageFrameWidth(frame, width) {
    if (!frame) return;
    var safeWidth = Math.max(35, Math.min(100, width));
    frame.setAttribute('data-image-width', String(safeWidth));
    frame.style.width = safeWidth + '%';
    frame.style.maxWidth = '100%';
  }

  function startImageResize(frame, event) {
    if (!frame || !editorEl) return;
    selectImageFrame(frame);
    var editorWidth = editorEl.getBoundingClientRect().width || MOBILE_WIDTH;
    imageResizeState = {
      frame: frame,
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: getImageFrameWidth(frame),
      editorWidth: editorWidth,
      moved: false
    };
    frame.setAttribute('data-image-resizing', 'true');
    if (event.target && event.target.setPointerCapture) {
      try { event.target.setPointerCapture(event.pointerId); } catch (_err) {}
    }
    event.preventDefault();
  }

  function updateImageResize(event) {
    if (!imageResizeState || !imageResizeState.frame) return false;
    var deltaX = event.clientX - imageResizeState.startX;
    var nextWidth = imageResizeState.startWidth + ((deltaX / imageResizeState.editorWidth) * 100);
    var safeWidth = Math.max(35, Math.min(100, nextWidth));
    if (Math.abs(safeWidth - imageResizeState.startWidth) > 0.8) {
      imageResizeState.moved = true;
    }
    setImageFrameWidth(imageResizeState.frame, Math.round(safeWidth));
    return true;
  }

  function finishImageResize() {
    if (!imageResizeState || !imageResizeState.frame) return false;
    var frame = imageResizeState.frame;
    var width = getImageFrameWidth(frame);
    frame.removeAttribute('data-image-resizing');
    var moved = imageResizeState.moved;
    imageResizeState = null;
    if (moved) {
      prepareHistoryMutation();
      pushHistorySnapshot('image-resize', true);
      showToast(width >= 98 ? '\u56FE\u7247\u5DF2\u6062\u590D\u6EE1\u5BBD' : '\u56FE\u7247\u5BBD\u5EA6\u5DF2\u8C03\u6574\u4E3A ' + width + '%');
    }
    return moved;
  }

  function adjustSelectedImageSize(direction) {
    var frame = getActiveImageFrame();
    if (!frame) {
      showToast('\u8BF7\u5148\u70B9\u4E2D\u4E00\u5F20\u56FE\u7247', 2200);
      updateImageToolButtons();
      return false;
    }
    selectImageFrame(frame);

    var steps = [40, 55, 70, 85, 100];
    var current = getImageFrameWidth(frame);
    var next = 100;
    if (direction === 0) {
      next = 100;
    } else if (direction > 0) {
      next = steps.find(function (step) { return step > current; }) || 100;
    } else {
      for (var i = steps.length - 1; i >= 0; i--) {
        if (steps[i] < current) { next = steps[i]; break; }
      }
    }

    prepareHistoryMutation();
    setImageFrameWidth(frame, next);
    pushHistorySnapshot('image-size', true);
    showToast(direction === 0 ? '\u56FE\u7247\u5DF2\u8FD8\u539F\u4E3A\u539F\u5BBD' : '\u56FE\u7247\u5BBD\u5EA6\u5DF2\u8C03\u6574\u4E3A ' + next + '%');
    return true;
  }

  function getSelectedTextInEditor() {
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return '';
    var range = sel.getRangeAt(0);
    if (!editorEl.contains(range.commonAncestorContainer)) return '';
    return sel.toString().replace(/\s+/g, ' ').trim();
  }

  function getNextSectionIndex() {
    var max = 0;
    editorEl.querySelectorAll('.wx-section-index').forEach(function (el) {
      var text = (el.textContent || '').match(/\d+/);
      var val = text ? parseInt(text[0], 10) : 0;
      if (val > max) max = val;
    });
    return String(max + 1).padStart(2, '0');
  }

  function buildSectionMarkSvg(kind) {
    if (kind === 'quote') {
      return '<svg viewBox="0 0 24 24" fill="none"><path d="M7 8h3.5A2.5 2.5 0 0 1 13 10.5V12a2 2 0 0 1-2 2H9.4L8.4 17H6.6l1-3H7a2 2 0 0 1-2-2v-1.5A2.5 2.5 0 0 1 7.5 8Zm8 0h3.5A2.5 2.5 0 0 1 21 10.5V12a2 2 0 0 1-2 2h-1.6l-1 3h-1.8l1-3H15a2 2 0 0 1-2-2v-1.5A2.5 2.5 0 0 1 15.5 8Z"/></svg>';
    }
    if (kind === 'perspective') {
      return '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="9" r="2.7" stroke="currentColor" stroke-width="1.8"/><path d="M7.6 16.6c1.2-1.8 2.7-2.8 4.4-2.8s3.2 1 4.4 2.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="17" cy="14.6" r="1.5" fill="currentColor"/></svg>';
    }
    if (kind === 'metric') {
      return '<svg viewBox="0 0 24 24" fill="none"><path d="M6 17V11m6 6V7m6 10v-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="6" cy="17" r="1.6" fill="currentColor"/><circle cx="12" cy="7" r="1.6" fill="currentColor"/><circle cx="18" cy="13" r="1.6" fill="currentColor"/></svg>';
    }
    if (kind === 'compare') {
      return '<svg viewBox="0 0 24 24" fill="none"><path d="M5 9h6m0 0-2-2m2 2-2 2M19 15h-6m0 0 2-2m-2 2 2 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
    if (kind === 'timeline') {
      return '<svg viewBox="0 0 24 24" fill="none"><path d="M12 6v12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="7" r="1.7" fill="currentColor"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/><circle cx="12" cy="17" r="1.7" fill="currentColor"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" fill="none"><path d="M6 8.5h12M6 12h8M6 15.5h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="18" cy="15.5" r="1.7" fill="currentColor"/></svg>';
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

  function markEditable(root) {
    if (!root || !root.querySelectorAll) return;
    if (root.matches && root.matches('blockquote, h1, h2, h3, h4, p, li, td, th, .wx-lead, .wx-eyebrow, strong, small, span')) {
      if (!root.closest('.wx-section-mark')) root.setAttribute('contenteditable', 'true');
    }
    root.querySelectorAll('h1, h2, h3, h4, p, li, td, th, .wx-lead, .wx-eyebrow, strong, small, span').forEach(function (el) {
      if (!el.closest('.wx-section-mark')) el.setAttribute('contenteditable', 'true');
    });
  }

  function focusFirstEditable(root) {
    if (!root || !root.querySelector) return;
    var target = (root.matches && root.matches('blockquote, h2, h3, strong, p, small')) ? root : root.querySelector('h2, h3, strong, p, small');
    if (!target) return;
    target.focus();
    var range = document.createRange();
    range.selectNodeContents(target);
    range.collapse(false);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    captureSelection();
  }

  function getTemplateInsertAnchor() {
    var range = getSelectionRangeInEditor();
    var anchor = getRangeAnchorElement(range);
    if (!anchor || !anchor.closest) return null;
    return anchor.closest(BLOCK_INSERT_SELECTORS);
  }

  function insertTemplateBlock(type) {
    if (type === 'quote') {
      var selectedText = getSelectedTextInEditor();
      if (selectedText) {
        prepareHistoryMutation();
        restoreSelection();
        var sel = window.getSelection();
        if (sel && sel.rangeCount) {
          var range = sel.getRangeAt(0);
          range.deleteContents();
          var quoteWrap = document.createElement('div');
          quoteWrap.innerHTML =
            '<blockquote class="wx-quote-card" data-tp-template="quote-card">' +
            selectedText +
            '<small>补充这句话的来源、语境或注解</small>' +
            '</blockquote>';
          var quoteNode = quoteWrap.firstElementChild;
          range.insertNode(quoteNode);
          markEditable(quoteNode);
          focusFirstEditable(quoteNode);
        }
        pushHistorySnapshot('insert-quote', true);
        showToast('\u5DF2\u5C06\u9009\u4E2D\u6587\u5B57\u63D0\u70BC\u4E3A\u5F15\u8BED');
        return true;
      }
    }

    var anchor = getTemplateInsertAnchor();
    var shell = editorEl.querySelector('.wx-article-shell') || editorEl.querySelector('.article-theme') || editorEl;
    var node = cloneTemplateBlock(type);
    if (!node) return false;
    prepareHistoryMutation();
    markEditable(node);
    if (node.matches && node.matches('.wx-media-frame')) {
      selectImageFrame(node);
    }

    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(node, anchor.nextSibling);
    else shell.appendChild(node);

    focusFirstEditable(node);
    pushHistorySnapshot('insert-' + type, true);

    var messages = {
      section: '\u5DF2\u63D2\u5165\u65B0\u7AE0\u8282\u5361',
      summary: '\u5DF2\u63D2\u5165\u6458\u8981\u5361',
      metric: '\u5DF2\u63D2\u5165\u6307\u6807\u7EC4',
      compare: '\u5DF2\u63D2\u5165\u5BF9\u6BD4\u5361',
      timeline: '\u5DF2\u63D2\u5165\u65F6\u95F4\u7EBF',
      quote: '\u5DF2\u63D2\u5165\u5F15\u8BED\u5361'
    };
    showToast(messages[type] || '\u5DF2\u63D2\u5165\u7EC4\u4EF6');
    return true;
  }

  async function handleImageFiles(files) {
    prepareHistoryMutation();
    for (var i = 0; i < files.length; i++) {
      if (!files[i].type.startsWith('image/')) continue;
      try {
        var d = await fileToDataUrl(files[i]);
        insertHtmlAtCursor(buildImageBlock(d));
        var frames = editorEl.querySelectorAll('.wx-media-frame');
        if (frames.length) {
          ensureImageFrameHandle(frames[frames.length - 1]);
          selectImageFrame(frames[frames.length - 1]);
        }
      } catch (e) { console.error(e); }
    }
    pushHistorySnapshot('insert-image', true);
    showToast('\u56FE\u7247\u63D2\u5165\u5B8C\u6210');
  }
