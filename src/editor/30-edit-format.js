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

  function getFontSizeTargets(range) {
    var targets = getAlignmentTargets(range);
    if (targets.length > 0) return targets;

    var anchor = getRangeAnchorElement(range);
    if (!anchor || !anchor.closest) return [];
    var closestTarget = anchor.closest(ALIGN_TARGET_SELECTORS);
    return closestTarget && editorEl.contains(closestTarget) ? [closestTarget] : [];
  }

  function readTargetFontSize(target) {
    if (!target) return 16;
    var computed = window.getComputedStyle(target);
    var size = parseFloat(computed.fontSize || '16');
    return Number.isFinite(size) ? size : 16;
  }

  function getTargetFontSizeBounds(target) {
    if (!target || !target.matches) return { min: 13, max: 34, step: 2 };
    if (target.matches('h1')) return { min: 26, max: 44, step: 2 };
    if (target.matches('h2')) return { min: 22, max: 36, step: 2 };
    if (target.matches('h3, h4, .wx-card-caption, .wx-section-index, .wx-eyebrow')) return { min: 12, max: 26, step: 1 };
    if (target.matches('small, figcaption')) return { min: 11, max: 18, step: 1 };
    return { min: 13, max: 28, step: 1 };
  }

  function setTargetFontSize(target, size) {
    if (!target || !target.style) return;
    target.style.fontSize = size + 'px';
    target.setAttribute('data-tp-font-size-local', 'true');
  }

  function clearTargetFontSize(target) {
    if (!target || !target.style) return;
    target.style.fontSize = '';
    target.removeAttribute('data-tp-font-size-local');
    if (target.getAttribute('style') === '') {
      target.removeAttribute('style');
    }
  }

  function adjustFontSize(direction) {
    var range = getSelectionRangeInEditor();
    var targets = getFontSizeTargets(range);
    if (!targets.length) {
      showToast('\u8BF7\u5148\u9009\u4E2D\u8981\u8C03\u6574\u7684\u6587\u5B57\u5757', 2400);
      return false;
    }

    targets.forEach(function (target) {
      var bounds = getTargetFontSizeBounds(target);
      var next = readTargetFontSize(target) + (bounds.step * direction);
      next = Math.max(bounds.min, Math.min(bounds.max, next));
      setTargetFontSize(target, next);
    });

    showToast(direction > 0 ? '\u5B57\u53F7\u5DF2\u8C03\u5927' : '\u5B57\u53F7\u5DF2\u8C03\u5C0F');
    return true;
  }

  function resetFontSizeOverrides() {
    var range = getSelectionRangeInEditor();
    var targets = getFontSizeTargets(range);
    if (!targets.length) {
      showToast('\u8BF7\u5148\u9009\u4E2D\u8981\u8FD8\u539F\u7684\u6587\u5B57\u5757', 2400);
      return false;
    }

    targets.forEach(function (target) {
      clearTargetFontSize(target);
    });
    showToast('\u5B57\u53F7\u5DF2\u8FD8\u539F');
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
