#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { loadSettings, SETTINGS_PATH } = require("./settings");

const SKILL_DIR = path.resolve(__dirname, "..");
const VERSION_PATH = path.join(SKILL_DIR, "version.json");
const PRESETS_PATH = path.join(SKILL_DIR, "assets", "presets.json");
const LOGO_DIR = path.join(SKILL_DIR, "logos");

function findChrome() {
  const candidates = process.platform === "darwin"
    ? [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
      ]
    : process.platform === "win32"
    ? [
        process.env.PROGRAMFILES + "\\Google\\Chrome\\Application\\chrome.exe",
        process.env["PROGRAMFILES(X86)"] + "\\Google\\Chrome\\Application\\chrome.exe",
        process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe",
        process.env.PROGRAMFILES + "\\Microsoft\\Edge\\Application\\msedge.exe",
      ]
    : [
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
        "/snap/bin/chromium",
      ];

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }

  return null;
}

function findLogoFile() {
  if (!fs.existsSync(LOGO_DIR)) return null;

  const candidates = [
    "brand-logo.png",
    "brand-logo.svg",
    "brand-logo.jpg",
    "brand-logo.jpeg",
    "logo.png",
    "logo.svg",
    "logo.jpg",
    "logo.jpeg",
  ];

  for (const filename of candidates) {
    const absolutePath = path.join(LOGO_DIR, filename);
    if (fs.existsSync(absolutePath)) return absolutePath;
  }

  return null;
}

function readVersion() {
  return JSON.parse(fs.readFileSync(VERSION_PATH, "utf-8")).version;
}

function commandExists(command) {
  try {
    execSync(`command -v ${command}`, { stdio: "ignore" });
    return true;
  } catch (_err) {
    return false;
  }
}

function probeCommand(command, expectedTokens = []) {
  try {
    const output = execSync(command, {
      encoding: "utf-8",
      timeout: 4000,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return {
      available: true,
      output: String(output || "").trim(),
    };
  } catch (err) {
    const output = `${err.stdout || ""}\n${err.stderr || ""}`.trim();
    const looksAvailable = expectedTokens.some((token) => output.includes(token));
    return {
      available: looksAvailable,
      output,
    };
  }
}

function extractTagInnerHtml(htmlContent, tagName) {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = htmlContent.match(pattern);
  return match ? match[1].trim() : null;
}

function extractFirstArticle(htmlContent) {
  const match = htmlContent.match(/<article\b[\s\S]*?<\/article>/i);
  return match ? match[0].trim() : null;
}

function extractReadableText(htmlContent) {
  return String(htmlContent || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function countClassToken(htmlContent, className) {
  const regex = new RegExp(`\\b${className}\\b`, "g");
  const matches = htmlContent.match(regex);
  return matches ? matches.length : 0;
}

function findMatchingTagEnd(html, openTagStart, tagName) {
  const tagRegex = new RegExp(`<\\/?${tagName}\\b[^>]*>`, "gi");
  tagRegex.lastIndex = openTagStart;
  let depth = 0;
  let match;

  while ((match = tagRegex.exec(html))) {
    const token = match[0];
    const isClosing = /^<\//.test(token);
    const selfClosing = /\/>$/.test(token);

    if (!isClosing && !selfClosing) {
      depth += 1;
    } else if (isClosing) {
      depth -= 1;
      if (depth === 0) return tagRegex.lastIndex;
    }
  }

  return -1;
}

function extractBalancedBlockFromOpenTag(html, openTagIndex, tagName) {
  const endIndex = findMatchingTagEnd(html, openTagIndex, tagName);
  return endIndex === -1 ? null : html.slice(openTagIndex, endIndex);
}

function collectBalancedBlocksByClass(htmlContent, className, tagNames = ["div", "section"]) {
  const tagAlternation = tagNames.join("|");
  const regex = new RegExp(
    `<(${tagAlternation})\\b([^>]*class=(['"])[^'"]*\\b${className}\\b[^'"]*\\3[^>]*)>`,
    "gi"
  );
  const blocks = [];
  let match;

  while ((match = regex.exec(htmlContent))) {
    const block = extractBalancedBlockFromOpenTag(htmlContent, match.index, match[1]);
    if (!block) continue;
    blocks.push(block);
    regex.lastIndex = match.index + block.length;
  }

  return blocks;
}

function detectContentTemplate(articleHtml) {
  const attrMatch = articleHtml.match(/data-content-template=(['"])([^'"]+)\1/i);
  if (attrMatch) return attrMatch[2];

  const pageTone = articleHtml.match(/data-page-tone=(['"])([^'"]+)\1/i)?.[2];
  if (pageTone === "event-notice") return "event-notice";

  const titleText = extractReadableText(articleHtml.match(/<h1\b[\s\S]*?<\/h1>/i)?.[0] || "");
  const leadText = extractReadableText(articleHtml.match(/<p\b[^>]*class=(['"])[^'"]*wx-lead[^'"]*\1[\s\S]*?<\/p>/i)?.[0] || "");
  const fullText = extractReadableText(articleHtml);

  const templates = [
    { id: "event-notice", tokens: ["招募", "报名", "活动", "地点", "时间", "日程", "通知", "公告"] },
    { id: "weekly-report", tokens: ["周报", "本周", "下周", "完成", "进展", "风险", "复盘"] },
    { id: "release-brief", tokens: ["发布", "上线", "更新", "升级", "版本", "新功能"] },
    { id: "knowledge-article", tokens: ["原理", "教程", "指南", "研究", "方法", "解释"] },
    { id: "case-recap", tokens: ["案例", "项目", "复盘", "拆解", "实践", "结果"] },
  ];

  let best = { id: "knowledge-article", score: 0 };
  templates.forEach((entry) => {
    const score = entry.tokens.reduce((sum, token) => {
      const titleHits = (titleText.match(new RegExp(token, "gi")) || []).length * 3;
      const leadHits = (leadText.match(new RegExp(token, "gi")) || []).length * 2;
      const textHits = (fullText.match(new RegExp(token, "gi")) || []).length;
      return sum + titleHits + leadHits + textHits;
    }, 0);
    if (score > best.score) best = { id: entry.id, score };
  });
  return best.id;
}

function summarizeComponentCounts(articleHtml) {
  return {
    hero: countClassToken(articleHtml, "wx-hero-card"),
    intro: countClassToken(articleHtml, "wx-intro-card"),
    section: countClassToken(articleHtml, "wx-section-card"),
    metric_grid: countClassToken(articleHtml, "wx-metric-grid"),
    metric_card: countClassToken(articleHtml, "wx-metric-card"),
    compare_grid: countClassToken(articleHtml, "wx-compare-grid"),
    compare_card: countClassToken(articleHtml, "wx-compare-card"),
    timeline: countClassToken(articleHtml, "wx-timeline-card"),
    quote: countClassToken(articleHtml, "wx-quote-card"),
    summary: countClassToken(articleHtml, "wx-summary-card"),
    image_drop_zone: countClassToken(articleHtml, "wx-image-drop-zone"),
    inline_graphic: countClassToken(articleHtml, "wx-inline-graphic"),
    badge_art: countClassToken(articleHtml, "wx-badge-art"),
  };
}

function buildHeadingAudit(articleHtml, pageTone) {
  const sectionTopBlocks = collectBalancedBlocksByClass(articleHtml, "wx-section-top", ["div"]);
  const sections = [];
  const errors = [];
  const warnings = [];
  let previousIndex = null;

  sectionTopBlocks.forEach((sectionTopBlock, idx) => {
    const sectionNumber = idx + 1;
    const headingBlock = collectBalancedBlocksByClass(sectionTopBlock, "wx-section-heading", ["div"])[0] || "";
    const iconCount = countClassToken(sectionTopBlock, "wx-section-icon");
    const markCount = countClassToken(headingBlock, "wx-section-mark");
    const legacyDecorCount = countClassToken(headingBlock, "wx-section-emblem")
      + countClassToken(headingBlock, "wx-title-flank")
      + countClassToken(headingBlock, "wx-heading-ornament");
    const hasCaption = /\bwx-card-caption\b/.test(headingBlock);
    const hasTitleRow = /\bwx-title-row\b/.test(headingBlock);
    const indexPos = headingBlock.indexOf("wx-section-index");
    const captionPos = headingBlock.indexOf("wx-card-caption");
    const markPos = headingBlock.indexOf("wx-section-mark");
    const titlePos = headingBlock.indexOf("<h2");
    const indexText = headingBlock.match(/<[^>]*class=(['"])[^'"]*wx-section-index[^'"]*\1[^>]*>([\s\S]*?)<\/[^>]+>/i)?.[2] || "";
    const indexValue = parseInt((extractReadableText(indexText).match(/\d+/) || [])[0] || "", 10);

    if (legacyDecorCount > 0) {
      errors.push(`section ${sectionNumber} uses deprecated heading decorators`);
    }
    if (markCount > 1 || markCount + legacyDecorCount > 1) {
      errors.push(`section ${sectionNumber} uses multiple heading graphics`);
    }
    if (pageTone === "event-notice" && iconCount > 0) {
      errors.push(`event-notice section ${sectionNumber} still uses wx-section-icon`);
    }
    if (pageTone === "event-notice" && markCount !== 1) {
      errors.push(`event-notice section ${sectionNumber} should provide exactly one wx-section-mark`);
    }
    if (!hasCaption) {
      warnings.push(`section ${sectionNumber} is missing wx-card-caption`);
    }
    if (!hasTitleRow) {
      warnings.push(`section ${sectionNumber} is missing wx-title-row`);
    }
    if (titlePos !== -1) {
      if (indexPos !== -1 && indexPos > titlePos) {
        errors.push(`section ${sectionNumber} puts wx-section-index after h2`);
      }
      if (captionPos !== -1 && captionPos > titlePos) {
        errors.push(`section ${sectionNumber} puts wx-card-caption after h2`);
      }
      if (markPos !== -1 && markPos > titlePos && pageTone !== "event-notice") {
        warnings.push(`section ${sectionNumber} places wx-section-mark after h2; reading layouts should keep meta info above title`);
      }
    }
    if (!Number.isNaN(indexValue)) {
      if (previousIndex === null && indexValue !== 1) {
        errors.push(`section numbering starts at ${indexValue} instead of 01`);
      }
      if (previousIndex !== null && indexValue !== previousIndex + 1) {
        errors.push(`section numbering jumps from ${previousIndex} to ${indexValue}`);
      }
      previousIndex = indexValue;
    }

    sections.push({
      section: sectionNumber,
      icon_count: iconCount,
      mark_count: markCount,
      legacy_decor_count: legacyDecorCount,
      has_caption: hasCaption,
      has_title_row: hasTitleRow,
      index_value: Number.isNaN(indexValue) ? null : indexValue,
    });
  });

  return {
    section_count: sectionTopBlocks.length,
    sections,
    errors,
    warnings,
  };
}

function buildDesignAudit(articleHtml) {
  const pageTone = articleHtml.match(/data-page-tone=(['"])([^'"]+)\1/i)?.[2] || null;
  const headingSystem = articleHtml.match(/data-heading-system=(['"])([^'"]+)\1/i)?.[2] || null;
  const styleFamily = articleHtml.match(/data-style-family=(['"])([^'"]+)\1/i)?.[2] || null;
  const contentTemplate = detectContentTemplate(articleHtml);
  const componentCounts = summarizeComponentCounts(articleHtml);
  const headingAudit = buildHeadingAudit(articleHtml, pageTone);
  const warnings = [...headingAudit.warnings];
  const errors = [...headingAudit.errors];

  if (pageTone === "event-notice" && headingSystem !== "index-led") {
    errors.push("event-notice page should use data-heading-system=\"index-led\"");
  }

  if (componentCounts.image_drop_zone > 0 && ["event-notice", "weekly-report", "knowledge-article", "case-recap"].includes(contentTemplate)) {
    errors.push("delivery page still contains wx-image-drop-zone; use native images instead");
  }

  if (styleFamily && ["swiss-journal", "ledger-spec", "archive-paper", "field-atlas", "brief-bulletin", "skyline-pane"].includes(styleFamily)) {
    if (componentCounts.badge_art > 0) {
      warnings.push("reading-first family still uses wx-badge-art");
    }
    if (componentCounts.inline_graphic > 1) {
      warnings.push("reading-first family contains multiple wx-inline-graphic blocks");
    }
  }

  if (contentTemplate === "weekly-report" && componentCounts.metric_grid + componentCounts.compare_grid === 0) {
    warnings.push("weekly-report template has no metric or compare grid");
  }

  if (contentTemplate === "release-brief" && componentCounts.section < 2 && componentCounts.metric_grid + componentCounts.compare_grid === 0) {
    warnings.push("release-brief template is too thin; add section cards or data blocks");
  }

  if (contentTemplate === "case-recap" && componentCounts.timeline + componentCounts.compare_grid + componentCounts.summary === 0) {
    warnings.push("case-recap template lacks a visible recap structure such as timeline / compare / summary");
  }

  const metricCardTexts = collectBalancedBlocksByClass(articleHtml, "wx-metric-card", ["div"])
    .map(extractReadableText)
    .filter(Boolean);
  const verboseMetricCount = metricCardTexts.filter((text) => text.length > 52).length;
  const metricStrongTexts = Array.from(articleHtml.matchAll(/<strong[^>]*>([\s\S]*?)<\/strong>/gi))
    .map((match) => extractReadableText(match[1]))
    .filter(Boolean);
  const oversizedMetricTitles = metricStrongTexts.filter((text) => text.length > 8).length;
  const compareHeadings = Array.from(articleHtml.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi))
    .map((match) => extractReadableText(match[1]))
    .filter(Boolean);
  const oversizedCompareHeadings = compareHeadings.filter((text) => text.length > 12).length;
  if (verboseMetricCount > 0) {
    warnings.push(`${verboseMetricCount} metric card(s) are too verbose for mobile scanning`);
  }
  if (oversizedMetricTitles > 0) {
    warnings.push(`${oversizedMetricTitles} metric title(s) are too long for compact cards`);
  }
  if (oversizedCompareHeadings > 0) {
    warnings.push(`${oversizedCompareHeadings} compare-card heading(s) are too long for side-by-side layout`);
  }

  const score = Math.max(0, 100 - errors.length * 22 - warnings.length * 8);

  return {
    page_tone: pageTone,
    heading_system: headingSystem,
    style_family: styleFamily,
    content_template: contentTemplate,
    component_counts: componentCounts,
    heading_audit: headingAudit,
    warnings,
    errors,
    score,
  };
}

function readPresetCount() {
  const presets = JSON.parse(fs.readFileSync(PRESETS_PATH, "utf-8"));
  const entries = Array.isArray(presets.presets) ? presets.presets : [];
  return {
    preset_count: entries.length,
    family_count: new Set(entries.map((entry) => entry.family).filter(Boolean)).size,
    archetype_count: new Set(entries.map((entry) => entry.archetype).filter(Boolean)).size,
  };
}

function diagnoseHtml(htmlPath) {
  const absolutePath = path.resolve(htmlPath);
  if (!fs.existsSync(absolutePath)) {
    return { path: absolutePath, ok: false, error: "File not found" };
  }

  const raw = fs.readFileSync(absolutePath, "utf-8");
  const bodyOrRaw = extractTagInnerHtml(raw, "body") || raw;
  const articleHtml = extractFirstArticle(bodyOrRaw) || bodyOrRaw;
  const articleCount = (articleHtml.match(/<article\b/gi) || []).length;
  const dividerCount = (articleHtml.match(/wx-divider-ornament/gi) || []).length;
  const freeHelpers = [
    "tp-free-shell",
    "tp-free-hero",
    "tp-free-kicker",
    "tp-free-panel",
    "tp-free-grid",
    "tp-free-stat",
    "tp-free-quote",
    "tp-free-note",
    "tp-free-divider",
    "tp-free-table-wrap",
  ].filter((className) => new RegExp(`\\b${className}\\b`).test(articleHtml));
  const hardcodedColorTokens = [...articleHtml.matchAll(/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g)]
    .map((match) => match[0].toLowerCase())
    .filter((token) => !["#fff", "#ffffff", "#000", "#000000"].includes(token))
    .filter((token, index, array) => array.indexOf(token) === index);
  const gridMatches = [...articleHtml.matchAll(/grid-template-columns\s*:\s*([^;"]+)/gi)];
  const riskyGrids = gridMatches
    .map((match) => match[1].trim())
    .filter((template) => /repeat\(\s*[3-9]\s*,/i.test(template) || /\b1fr\b.*\b1fr\b.*\b1fr\b/i.test(template));
  const uiMode = /data-ui-mode=(['"])free\1/i.test(articleHtml) ? "free" : "rule";
  const freeModeOk = uiMode !== "free" || freeHelpers.length > 0;
  const designAudit = buildDesignAudit(articleHtml);

  return {
    path: absolutePath,
    ok: articleCount === 1 && freeModeOk && designAudit.errors.length === 0,
    article_count: articleCount,
    has_document_tags: /<(?:html|head|body)\b/i.test(raw),
    ui_mode: uiMode,
    preset: articleHtml.match(/data-preset=(['"])([^'"]+)\1/i)?.[2] || null,
    style_family: articleHtml.match(/data-style-family=(['"])([^'"]+)\1/i)?.[2] || null,
    style_archetype: articleHtml.match(/data-style-archetype=(['"])([^'"]+)\1/i)?.[2] || null,
    page_tone: designAudit.page_tone,
    content_template: designAudit.content_template,
    divider_count: dividerCount,
    uses_free_helpers: freeHelpers.length > 0,
    free_helpers_found: freeHelpers,
    hardcoded_color_tokens: hardcodedColorTokens,
    risky_grid_templates: riskyGrids,
    design_audit: designAudit,
  };
}

function detectOpenClawCapabilities() {
  const openclawCli = commandExists("openclaw");
  if (!openclawCli) {
    return {
      cli_found: false,
      message_send: false,
      feishu_plugin: false,
      feishu_drive_file: false,
    };
  }

  const messageProbe = probeCommand("openclaw message send --help", ["--message", "--filePath"]);
  const feishuDriveProbe = probeCommand("openclaw tool feishu_drive_file --help", ["--action", "upload", "file_path"]);

  return {
    cli_found: true,
    message_send: messageProbe.available,
    feishu_plugin: feishuDriveProbe.available,
    feishu_drive_file: feishuDriveProbe.available,
  };
}

function main() {
  const args = process.argv.slice(2);
  const settings = loadSettings();
  const htmlDiagnosis = args[0] ? diagnoseHtml(args[0]) : null;
  const presetCounts = readPresetCount();

  console.log(JSON.stringify({
    skill_dir: SKILL_DIR,
    settings_path: SETTINGS_PATH,
    version: readVersion(),
    ui: settings.ui,
    openclaw: detectOpenClawCapabilities(),
    logo: {
      ...settings.logo,
      file: findLogoFile(),
    },
    chrome: {
      found: !!findChrome(),
      path: findChrome(),
    },
    ...presetCounts,
    html_diagnosis: htmlDiagnosis,
  }, null, 2));
}

main();
