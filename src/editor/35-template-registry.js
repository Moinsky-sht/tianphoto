  /* ═══ 组件模板注册表 ═══ */

  var templateRegistryHost = null;

  function createTemplateElement(name, builder) {
    var template = document.createElement('template');
    template.setAttribute('data-template-name', name);
    template.content.appendChild(builder());
    return template;
  }

  function createTemplateNode(tagName, className, text) {
    var node = document.createElement(tagName);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function createSectionTemplateNode() {
    var section = createTemplateNode('section', 'wx-section-card');
    section.setAttribute('data-tp-template', 'section-card');

    var top = createTemplateNode('div', 'wx-section-top');
    var heading = createTemplateNode('div', 'wx-section-heading');
    var index = createTemplateNode('span', 'wx-section-index', '__NEXT_SECTION_INDEX__');
    var caption = createTemplateNode('div', 'wx-card-caption', '新章节');
    var mark = createTemplateNode('span', 'wx-section-mark');
    mark.setAttribute('aria-hidden', 'true');
    mark.setAttribute('data-mark-kind', 'perspective');
    mark.innerHTML = buildSectionMarkSvg('perspective');
    var titleRow = createTemplateNode('div', 'wx-title-row');
    var title = createTemplateNode('h2', '', '填写章节标题');
    titleRow.appendChild(title);
    heading.appendChild(index);
    heading.appendChild(caption);
    heading.appendChild(mark);
    heading.appendChild(titleRow);
    top.appendChild(heading);

    var body = createTemplateNode('div', 'wx-section-body');
    body.appendChild(createTemplateNode('p', '', '在这里补充这一节的正文内容。把核心信息写清楚，再根据需要继续插入图片、引用、指标或时间线。'));

    section.appendChild(top);
    section.appendChild(body);
    return section;
  }

  function createSummaryTemplateNode() {
    var section = createTemplateNode('section', 'wx-summary-card');
    section.setAttribute('data-tp-template', 'summary-card');
    section.appendChild(createTemplateNode('p', '', '用两三句话把这一段真正值得记住的核心结论写清楚，让读者不用看完整节也能先抓住重点。'));
    return section;
  }

  function createQuoteTemplateNode() {
    var blockquote = createTemplateNode('blockquote', 'wx-quote-card', '把这里改成一句真正值得被放大的核心表达。');
    blockquote.setAttribute('data-tp-template', 'quote-card');
    blockquote.appendChild(createTemplateNode('small', '', '补充这句话的来源、语境或注解'));
    return blockquote;
  }

  function createMetricTemplateNode() {
    var section = createTemplateNode('section', 'wx-metric-grid');
    section.setAttribute('data-tp-template', 'metric-grid');
    section.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
    [
      ['核心指标', '填写一句话说明，例如完成率、报名数或增长幅度。'],
      ['关键状态', '保持短句表达，让这块适合手机快速扫读。']
    ].forEach(function (item) {
      var card = createTemplateNode('div', 'wx-metric-card');
      card.appendChild(createTemplateNode('strong', '', item[0]));
      card.appendChild(createTemplateNode('span', '', item[1]));
      section.appendChild(card);
    });
    return section;
  }

  function createCompareTemplateNode() {
    var section = createTemplateNode('section', 'wx-compare-grid');
    section.setAttribute('data-tp-template', 'compare-grid');
    section.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
    [
      ['方案 A', '写清楚当前方案、当前阶段或当前版本的重点。'],
      ['方案 B', '写清楚对比项、下一阶段或升级后的变化。']
    ].forEach(function (item) {
      var card = createTemplateNode('div', 'wx-compare-card');
      card.appendChild(createTemplateNode('h3', '', item[0]));
      card.appendChild(createTemplateNode('p', '', item[1]));
      section.appendChild(card);
    });
    return section;
  }

  function createTimelineTemplateNode() {
    var section = createTemplateNode('section', 'wx-timeline-card');
    section.setAttribute('data-tp-template', 'timeline-card');
    [
      ['阶段一', '写下开始节点、准备动作或前置条件。'],
      ['阶段二', '写下中期推进、关键动作或检查点。'],
      ['阶段三', '写下结果交付、复盘结论或下一步安排。']
    ].forEach(function (item) {
      var timelineItem = createTemplateNode('div', 'wx-timeline-item');
      timelineItem.appendChild(createTemplateNode('div', 'wx-timeline-dot'));
      var content = createTemplateNode('div', '');
      content.appendChild(createTemplateNode('h3', '', item[0]));
      content.appendChild(createTemplateNode('p', '', item[1]));
      timelineItem.appendChild(content);
      section.appendChild(timelineItem);
    });
    return section;
  }

  function createImageTemplateNode() {
    var figure = createTemplateNode('figure', 'wx-media-frame');
    figure.setAttribute('data-image-width', '100');
    figure.style.width = '100%';
    figure.style.maxWidth = '100%';

    var img = document.createElement('img');
    img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="720" viewBox="0 0 1080 720">' +
      '<rect width="1080" height="720" fill="#f5f5f2"/>' +
      '<rect x="86" y="84" width="908" height="552" rx="36" fill="#ffffff" stroke="#dad7d1" stroke-width="8"/>' +
      '<path d="M196 504L388 308l136 146 118-96 178 146" fill="none" stroke="#c85a43" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="382" cy="250" r="56" fill="#efd8ce"/>' +
      '</svg>'
    );
    img.alt = '插图';
    img.className = 'polished-image';
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    figure.appendChild(img);

    var handle = createTemplateNode('button', 'wx-media-resize-handle');
    handle.type = 'button';
    handle.setAttribute('aria-label', '拖拽调整图片大小');
    handle.setAttribute('title', '拖拽调整图片大小');
    figure.appendChild(handle);
    return figure;
  }

  function ensureTemplateRegistry() {
    if (templateRegistryHost && document.body.contains(templateRegistryHost)) return templateRegistryHost;

    templateRegistryHost = document.createElement('div');
    templateRegistryHost.className = 'tp-template-registry';
    templateRegistryHost.hidden = true;
    templateRegistryHost.setAttribute('aria-hidden', 'true');

    [
      ['section', createSectionTemplateNode],
      ['summary', createSummaryTemplateNode],
      ['quote', createQuoteTemplateNode],
      ['metric', createMetricTemplateNode],
      ['compare', createCompareTemplateNode],
      ['timeline', createTimelineTemplateNode],
      ['image', createImageTemplateNode]
    ].forEach(function (entry) {
      templateRegistryHost.appendChild(createTemplateElement(entry[0], entry[1]));
    });

    document.body.appendChild(templateRegistryHost);
    return templateRegistryHost;
  }

  function getTemplateElement(type) {
    ensureTemplateRegistry();
    return templateRegistryHost.querySelector('template[data-template-name="' + type + '"]');
  }

  function cloneTemplateBlock(type) {
    var template = getTemplateElement(type);
    if (!template) return null;
    var node = template.content.firstElementChild.cloneNode(true);
    if (type === 'section') {
      var index = node.querySelector('.wx-section-index');
      if (index) index.textContent = getNextSectionIndex();
    }
    return node;
  }
