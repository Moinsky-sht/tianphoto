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
          '<div class="export-format-switch">' +
            '<button class="export-format-btn is-active" data-format="jpg">JPG\uff08\u66F4\u8F7B\uff0C\u9002\u5408\u53D1\u5E03\uff09</button>' +
            '<button class="export-format-btn" data-format="png">PNG\uff08\u66F4\u7A33\uff0C\u9002\u5408\u7CBE\u4FEE\uff09</button>' +
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

    dialog.querySelectorAll('.export-format-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var format = this.dataset.format;
        if (format === currentExportFormat) return;
        currentExportFormat = format;
        currentPreviewIndex = 0;
        updateExportFormatButtons();
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

  function updateExportFormatButtons() {
    if (!dialog) return;
    dialog.querySelectorAll('.export-format-btn').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.dataset.format === currentExportFormat);
    });
  }

  function showExportModal() {
    currentExportMode = 'full';
    currentPreviewIndex = 0;
    currentExportFormat = 'jpg';
    currentPreviewScaleMode = 'actual';
    updateExportModeButtons();
    updateExportFormatButtons();
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
