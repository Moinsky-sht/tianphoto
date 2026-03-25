  /* ═══ 工具栏（SVG 图标）═══ */

  function getInsertTemplateIcon(type) {
    if (type === 'section') {
      return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none"><path d="M5 7.5h14M5 12h10M5 16.5h8" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><circle cx="18" cy="16.5" r="1.8" fill="currentColor"/></svg>';
    }
    if (type === 'summary') {
      return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none"><rect x="5" y="5" width="14" height="14" rx="3" stroke="currentColor" stroke-width="1.8"/><path d="M8 10h8M8 14h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
    }
    if (type === 'quote') {
      return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none"><path d="M6 8h4a2 2 0 0 1 2 2v1.5A2.5 2.5 0 0 1 9.5 14H8l-1 3H5l1-3a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2Zm8 0h4a2 2 0 0 1 2 2v1.5a2.5 2.5 0 0 1-2.5 2.5H16l-1 3h-2l1-3a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>';
    }
    if (type === 'image') {
      return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none"><rect x="4" y="5" width="16" height="14" rx="3" stroke="currentColor" stroke-width="1.8"/><circle cx="9" cy="10" r="1.8" fill="currentColor"/><path d="M5.5 17l4.5-4 3.5 3 4.5-5 2 2.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
    if (type === 'metric') {
      return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none"><path d="M6 17V11m6 6V7m6 10v-4" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><circle cx="6" cy="17" r="1.8" fill="currentColor"/><circle cx="12" cy="7" r="1.8" fill="currentColor"/><circle cx="18" cy="13" r="1.8" fill="currentColor"/></svg>';
    }
    if (type === 'compare') {
      return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none"><path d="M5 9h6m0 0-2-2m2 2-2 2M19 15h-6m0 0 2-2m-2 2 2 2" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none"><path d="M12 6v12M7 11l5-5 5 5M7 17h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function buildInsertItem(type, label) {
    return '<button type="button" class="editor-insert-item" data-template="' + type + '">' +
      '<span class="editor-insert-icon" aria-hidden="true">' + getInsertTemplateIcon(type) + '</span>' +
      '<span class="editor-insert-text">' + label + '</span>' +
    '</button>';
  }

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
      '<button data-command="fontSizeDown" title="\u5B57\u53F7\u8C03\u5C0F"><span class="toolbar-font-step">A-</span></button>' +
      '<button data-command="fontSizeReset" title="\u5B57\u53F7\u8FD8\u539F"><span class="toolbar-font-step">A0</span></button>' +
      '<button data-command="fontSizeUp" title="\u5B57\u53F7\u8C03\u5927"><span class="toolbar-font-step">A+</span></button>' +
      '<span class="toolbar-sep"></span>' +
      '<button data-command="justifyLeft" title="\u5DE6\u5BF9\u9F50"><svg viewBox="0 0 20 20" width="18" height="18"><rect x="3" y="4" width="12" height="2" rx="1" fill="currentColor"/><rect x="3" y="9" width="10" height="2" rx="1" fill="currentColor"/><rect x="3" y="14" width="14" height="2" rx="1" fill="currentColor"/></svg></button>' +
      '<button data-command="justifyCenter" title="\u5C45\u4E2D\u5BF9\u9F50"><svg viewBox="0 0 20 20" width="18" height="18"><rect x="4" y="4" width="12" height="2" rx="1" fill="currentColor"/><rect x="5" y="9" width="10" height="2" rx="1" fill="currentColor"/><rect x="3" y="14" width="14" height="2" rx="1" fill="currentColor"/></svg></button>' +
      '<button data-command="justifyRight" title="\u53F3\u5BF9\u9F50"><svg viewBox="0 0 20 20" width="18" height="18"><rect x="5" y="4" width="12" height="2" rx="1" fill="currentColor"/><rect x="7" y="9" width="10" height="2" rx="1" fill="currentColor"/><rect x="3" y="14" width="14" height="2" rx="1" fill="currentColor"/></svg></button>' +
      '<span class="toolbar-sep"></span>' +
      '<button data-command="insertUnorderedList" title="\u65E0\u5E8F\u5217\u8868"><svg viewBox="0 0 20 20" width="18" height="18"><circle cx="3" cy="5" r="1.5" fill="currentColor"/><circle cx="3" cy="10" r="1.5" fill="currentColor"/><circle cx="3" cy="15" r="1.5" fill="currentColor"/><rect x="7" y="4" width="11" height="2" rx="1" fill="currentColor"/><rect x="7" y="9" width="11" height="2" rx="1" fill="currentColor"/><rect x="7" y="14" width="11" height="2" rx="1" fill="currentColor"/></svg></button>' +
      '<button data-command="insertOrderedList" title="\u6709\u5E8F\u5217\u8868"><svg viewBox="0 0 20 20" width="18" height="18"><text x="1" y="7" font-size="7" font-weight="700" fill="currentColor">1</text><text x="1" y="12.5" font-size="7" font-weight="700" fill="currentColor">2</text><text x="1" y="18" font-size="7" font-weight="700" fill="currentColor">3</text><rect x="7" y="4" width="11" height="2" rx="1" fill="currentColor"/><rect x="7" y="9" width="11" height="2" rx="1" fill="currentColor"/><rect x="7" y="14" width="11" height="2" rx="1" fill="currentColor"/></svg></button>' +
      '<button data-command="formatBlock" data-value="blockquote" title="\u5F15\u7528"><svg viewBox="0 0 20 20" width="18" height="18"><path d="M3 4h3a3 3 0 013 3v1a3 3 0 01-3 3H5l-1 3H2l1-3a3 3 0 01-1-2V7a3 3 0 011-3zm8 0h3a3 3 0 013 3v1a3 3 0 01-3 3h-1l-1 3h-2l1-3a3 3 0 01-1-2V7a3 3 0 011-3z" fill="currentColor"/></svg></button>' +
      '<span class="toolbar-sep"></span>' +
      '<button data-command="insertImage" title="\u63D2\u5165\u56FE\u7247"><svg viewBox="0 0 20 20" width="18" height="18"><rect x="2" y="3" width="16" height="14" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="7" cy="8" r="2" fill="currentColor"/><path d="M2 14l4-4 3 3 4-5 5 6H2z" fill="currentColor" opacity=".6"/></svg></button>' +
      '<span class="toolbar-sep"></span>' +
      '<button data-command="toggleInsertPanel" class="toolbar-template toolbar-template-toggle" title="\u63D2\u5165\u7EC4\u4EF6">\u7EC4\u4EF6</button>';

    var rightGroup = document.createElement('div');
    rightGroup.className = 'toolbar-group toolbar-group-actions';
    rightGroup.innerHTML =
      '<button data-command="save" class="toolbar-save" title="\u4FDD\u5B58\u7F51\u9875\u6587\u4EF6"><svg viewBox="0 0 20 20" width="16" height="16"><path d="M3 3h11l3 3v11a1 1 0 01-1 1H4a1 1 0 01-1-1V3zm3 0v5h7V3zm1 9a2 2 0 104 0 2 2 0 00-4 0z" fill="currentColor"/></svg> \u4FDD\u5B58</button>' +
      '<button data-command="copyWechatNative" class="toolbar-wechat" title="\u590D\u5236\u516C\u4F17\u53F7 HTML"><svg viewBox="0 0 20 20" width="16" height="16" fill="none"><path d="M6.5 6.5h7a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="1.5"/><path d="M8.5 4.5h5a2 2 0 0 1 2 2v5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M8 10h4M8 12.5h3.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> \u516C\u4F17\u53F7\u590D\u5236</button>' +
      '<button data-command="export" class="toolbar-export" title="\u5BFC\u51FA PNG"><svg viewBox="0 0 20 20" width="16" height="16"><path d="M10 3v9m0 0l-3-3m3 3l3-3M4 14v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg> \u5BFC\u51FA</button>';

    toolbar.appendChild(leftGroup);
    toolbar.appendChild(rightGroup);

    toolbar.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-command]');
      if (!btn) return;
      var cmd = btn.dataset.command;
      var val = btn.dataset.value;
      if (cmd === 'undo') { undoHistory(); return; }
      if (cmd === 'redo') { redoHistory(); return; }
      if (cmd === 'export') { exportPage(); return; }
      if (cmd === 'save') { saveHtml(); return; }
      if (cmd === 'copyWechat' || cmd === 'copyWechatNative') { copyWeChatRichText(); return; }
      if (cmd === 'insertImage') { openImagePicker(); return; }
      if (cmd === 'toggleInsertPanel') { toggleInsertPanel(); return; }
      if (cmd === 'fontSizeDown') {
        restoreSelection();
        if (adjustFontSize(-1)) pushHistorySnapshot('font-size-down', true);
        return;
      }
      if (cmd === 'fontSizeReset') {
        restoreSelection();
        if (resetFontSizeOverrides()) pushHistorySnapshot('font-size-reset', true);
        return;
      }
      if (cmd === 'fontSizeUp') {
        restoreSelection();
        if (adjustFontSize(1)) pushHistorySnapshot('font-size-up', true);
        return;
      }
      if (cmd === 'justifyLeft' || cmd === 'justifyCenter' || cmd === 'justifyRight') {
        restoreSelection();
        applyTextAlignment(cmd);
        scheduleHistorySnapshot('alignment');
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
      scheduleHistorySnapshot(cmd);
    });

    document.body.appendChild(toolbar);
    updateImageToolButtons();
  }

  function createInsertPanel() {
    insertPanel = document.createElement('div');
    insertPanel.className = 'editor-insert-panel';
    insertPanel.setAttribute('aria-hidden', 'true');
    insertPanel.innerHTML =
      '<div class="editor-insert-panel-header">' +
        '<strong>组件</strong>' +
      '</div>' +
      '<div class="editor-insert-group">' +
        '<div class="editor-insert-label">章节结构</div>' +
        '<div class="editor-insert-grid">' +
          buildInsertItem('section', '\u7AE0\u8282\u5361') +
          buildInsertItem('summary', '\u6458\u8981\u5361') +
        '</div>' +
      '</div>' +
      '<div class="editor-insert-group">' +
        '<div class="editor-insert-label">强调表达</div>' +
        '<div class="editor-insert-grid">' +
          buildInsertItem('quote', '\u5F15\u8BED\u5361') +
          buildInsertItem('image', '\u56FE\u7247') +
        '</div>' +
      '</div>' +
      '<div class="editor-insert-group">' +
        '<div class="editor-insert-label">信息模块</div>' +
        '<div class="editor-insert-grid">' +
          buildInsertItem('metric', '\u6307\u6807\u7EC4') +
          buildInsertItem('compare', '\u5BF9\u6BD4\u5361') +
          buildInsertItem('timeline', '\u65F6\u95F4\u7EBF') +
        '</div>' +
      '</div>';

    insertPanel.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-template]');
      if (!btn) return;
      var type = btn.dataset.template;
      if (type === 'image') {
        hideInsertPanel();
        openImagePicker();
        return;
      }
      if (insertTemplateBlock(type)) {
        hideInsertPanel();
      }
    });

    document.body.appendChild(insertPanel);
  }

  function toggleInsertPanel() {
    if (!insertPanel) return;
    var willShow = !insertPanel.classList.contains('is-visible');
    insertPanel.classList.toggle('is-visible', willShow);
    insertPanel.setAttribute('aria-hidden', willShow ? 'false' : 'true');
    if (toolbar) {
      var toggleBtn = toolbar.querySelector('[data-command="toggleInsertPanel"]');
      if (toggleBtn) toggleBtn.classList.toggle('is-active', willShow);
    }
  }

  function hideInsertPanel() {
    if (!insertPanel) return;
    insertPanel.classList.remove('is-visible');
    insertPanel.setAttribute('aria-hidden', 'true');
    if (toolbar) {
      var toggleBtn = toolbar.querySelector('[data-command="toggleInsertPanel"]');
      if (toggleBtn) toggleBtn.classList.remove('is-active');
    }
  }

  function getHistorySnapshot() {
    return {
      html: editorEl ? editorEl.innerHTML : '',
      headingFont: pageFontState.heading || '',
      bodyFont: pageFontState.body || ''
    };
  }

  function getHistorySnapshotKey(snapshot) {
    return [
      snapshot.html,
      snapshot.headingFont,
      snapshot.bodyFont
    ].join('\n<!--tp-history-->\n');
  }

  function updateHistoryButtons() {
    if (!toolbar) return;
    var undoBtn = toolbar.querySelector('[data-command="undo"]');
    var redoBtn = toolbar.querySelector('[data-command="redo"]');
    if (undoBtn) undoBtn.disabled = historyEntries.length <= 1;
    if (redoBtn) redoBtn.disabled = redoEntries.length === 0;
  }

  function updateImageToolButtons() {
    return;
  }

  function prepareHistoryMutation() {
    if (historyRestoring || isExporting) return;
    flushHistorySnapshot();
  }

  function pushHistorySnapshot(reason, force) {
    if (!editorEl || historyRestoring || isExporting) return;
    if (historyTimer) {
      clearTimeout(historyTimer);
      historyTimer = null;
    }

    var snapshot = getHistorySnapshot();
    var current = historyEntries[historyEntries.length - 1];
    if (!force && current && getHistorySnapshotKey(current) === getHistorySnapshotKey(snapshot)) {
      updateHistoryButtons();
      return;
    }

    historyEntries.push(snapshot);
    if (historyEntries.length > HISTORY_LIMIT) {
      historyEntries.shift();
    }
    redoEntries = [];
    historyIndex = historyEntries.length - 1;
    updateHistoryButtons();
  }

  function scheduleHistorySnapshot(reason, immediate) {
    if (historyRestoring || isExporting) return;
    if (historyTimer) clearTimeout(historyTimer);
    if (immediate) {
      pushHistorySnapshot(reason, true);
      return;
    }
    historyTimer = setTimeout(function () {
      pushHistorySnapshot(reason, false);
    }, 180);
  }

  function restoreHistorySnapshot(snapshot) {
    if (!editorEl || !snapshot) return false;

    historyRestoring = true;
    if (historyObserver) historyObserver.disconnect();
    if (historyTimer) {
      clearTimeout(historyTimer);
      historyTimer = null;
    }
    savedRange = null;

    editorEl.innerHTML = snapshot.html;
    pageFontState.heading = snapshot.headingFont || '';
    pageFontState.body = snapshot.bodyFont || '';
    rebuildPageFontStyle();
    markEditable(editorEl);
    hideInsertPanel();

    historyRestoring = false;
    startHistoryObserver();
    historyIndex = historyEntries.length - 1;
    updateHistoryButtons();
    return true;
  }

  function flushHistorySnapshot() {
    if (!historyTimer) return;
    clearTimeout(historyTimer);
    historyTimer = null;
    pushHistorySnapshot('flush', false);
  }

  function undoHistory() {
    flushHistorySnapshot();
    if (historyEntries.length <= 1) {
      showToast('已经是最早一步', 1800);
      updateHistoryButtons();
      return false;
    }
    var current = historyEntries.pop();
    if (current) redoEntries.push(current);
    if (restoreHistorySnapshot(historyEntries[historyEntries.length - 1])) {
      showToast('已撤销');
      return true;
    }
    return false;
  }

  function redoHistory() {
    flushHistorySnapshot();
    if (!redoEntries.length) {
      showToast('已经是最新一步', 1800);
      updateHistoryButtons();
      return false;
    }
    var snapshot = redoEntries.pop();
    historyEntries.push(snapshot);
    if (historyEntries.length > HISTORY_LIMIT) {
      historyEntries.shift();
    }
    if (restoreHistorySnapshot(snapshot)) {
      showToast('已重做');
      return true;
    }
    return false;
  }

  function initHistory() {
    if (historyObserver) historyObserver.disconnect();
    if (window.MutationObserver) {
      historyObserver = new MutationObserver(function (mutations) {
        if (historyRestoring || isExporting) return;
        var meaningful = mutations.some(function (mutation) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'contenteditable') return false;
          if (mutation.type === 'attributes' && mutation.attributeName === 'class' && mutation.target === editorEl) return false;
          if (mutation.type === 'attributes' && mutation.attributeName === 'class' && mutation.target.closest && mutation.target.closest('.wx-media-frame')) return false;
          return true;
        });
        if (meaningful) scheduleHistorySnapshot('mutation');
      });
    }

    historyEntries = [];
    redoEntries = [];
    historyIndex = -1;
    pushHistorySnapshot('init', true);
    startHistoryObserver();

    updateHistoryButtons();
  }

  function startHistoryObserver() {
    if (!historyObserver || !editorEl) return;
    historyObserver.observe(editorEl, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['style', 'src', 'class', 'contenteditable']
    });
  }
