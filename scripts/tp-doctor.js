#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { loadSettings, SETTINGS_PATH } = require("./settings");
const htmlHelpers = require("./lib/html-helpers");
const { CONTENT_TEMPLATE_RULES } = require("./lib/content-template-rules");
const sharedFamilyMatrix = require("./lib/family-matrix");
const svgGrammar = require("./lib/svg-grammar");
const { getBuildStatus, CSS_SOURCE_FILES, EDITOR_SOURCE_FILES } = require("./lib/build-assets");

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
  return htmlHelpers.extractTagInnerHtml(htmlContent, tagName);
}

function extractFirstArticle(htmlContent) {
  return htmlHelpers.extractFirstArticle(htmlContent);
}

function extractReadableText(htmlContent) {
  return htmlHelpers.extractReadableText(htmlContent);
}

function countClassToken(htmlContent, className) {
  return htmlHelpers.countClassToken(htmlContent, className);
}

function findMatchingTagEnd(html, openTagStart, tagName) {
  return htmlHelpers.findMatchingTagEnd(html, openTagStart, tagName);
}

function extractBalancedBlockFromOpenTag(html, openTagIndex, tagName) {
  return htmlHelpers.extractBalancedBlockFromOpenTag(html, openTagIndex, tagName);
}

function collectBalancedBlocksByClass(htmlContent, className, tagNames = ["div", "section"]) {
  return htmlHelpers.collectBalancedBlocksByClass(htmlContent, className, tagNames);
}

function detectContentTemplate(articleHtml) {
  const attrMatch = articleHtml.match(/data-content-template=(['"])([^'"]+)\1/i);
  if (attrMatch) return attrMatch[2];

  const pageTone = articleHtml.match(/data-page-tone=(['"])([^'"]+)\1/i)?.[2];
  if (pageTone === "event-notice") return "event-notice";

  const titleText = extractReadableText(articleHtml.match(/<h1\b[\s\S]*?<\/h1>/i)?.[0] || "");
  const leadText = extractReadableText(articleHtml.match(/<p\b[^>]*class=(['"])[^'"]*wx-lead[^'"]*\1[\s\S]*?<\/p>/i)?.[0] || "");
  const fullText = extractReadableText(articleHtml);

  const templates = Object.values(CONTENT_TEMPLATE_RULES).map((rule) => ({
    id: rule.id,
    tokens: rule.keywords,
  }));

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

function getArticleArchetype(articleHtml) {
  return articleHtml.match(/data-style-archetype=(['"])([^'"]+)\1/i)?.[2] || null;
}

function getArticleSvgGrammar(articleHtml) {
  return articleHtml.match(/data-svg-grammar=(['"])([^'"]+)\1/i)?.[2] || null;
}

function getArticleHeroScene(articleHtml) {
  return articleHtml.match(/data-hero-scene=(['"])([^'"]+)\1/i)?.[2] || null;
}

function getArticleReadingPriority(articleHtml) {
  return articleHtml.match(/data-reading-priority=(['"])([^'"]+)\1/i)?.[2] || null;
}

function getArticleSceneDensity(articleHtml) {
  return articleHtml.match(/data-scene-density=(['"])([^'"]+)\1/i)?.[2] || null;
}

function getArticleMarkProminence(articleHtml) {
  return articleHtml.match(/data-mark-prominence=(['"])([^'"]+)\1/i)?.[2] || null;
}

function getArticleHeroAnchor(articleHtml) {
  return articleHtml.match(/data-hero-anchor=(['"])([^'"]+)\1/i)?.[2] || null;
}

function getArticleMarkPlacement(articleHtml) {
  return articleHtml.match(/data-mark-placement=(['"])([^'"]+)\1/i)?.[2] || null;
}

function getArticleGraphicQuietness(articleHtml) {
  return articleHtml.match(/data-graphic-quietness=(['"])([^'"]+)\1/i)?.[2] || null;
}

function getArticleTitleSafe(articleHtml) {
  return articleHtml.match(/data-title-safe=(['"])([^'"]+)\1/i)?.[2] || null;
}

function getArticleFrameBudget(articleHtml) {
  return articleHtml.match(/data-frame-budget=(['"])([^'"]+)\1/i)?.[2] || null;
}

function getArticleSvgNoiseBudget(articleHtml) {
  return articleHtml.match(/data-svg-noise-budget=(['"])([^'"]+)\1/i)?.[2] || null;
}

function fingerprintSvgMarkup(svgContent) {
  return String(svgContent || "")
    .replace(/\s+/g, " ")
    .replace(/\s(?:fill|stroke|opacity|stop-color|stroke-width|stroke-linecap|stroke-linejoin|filter|transform|style|class|xmlns|aria-hidden|data-[^=]+)=(['"])[^'"]*\1/gi, "")
    .replace(/\d+(?:\.\d+)?/g, "#")
    .trim();
}

function countSvgNodes(svgContent) {
  return (String(svgContent || "").match(/<(?:path|circle|rect|line|polyline|polygon|ellipse)\b/gi) || []).length;
}

function svgLooksLowContrast(svgContent) {
  const hasThemeDrivenColor = /currentColor|var\(--accent|var\(--text|var\(--hero|var\(--brand/i.test(svgContent);
  const hasNonWhiteColor = /#[0-9a-fA-F]{3,8}/.test(svgContent)
    || /rgba?\(\s*(?!255\s*,\s*255\s*,\s*255)/i.test(svgContent);
  const usesWhiteOnly = /rgba?\(\s*255\s*,\s*255\s*,\s*255/i.test(svgContent)
    || /fill=(['"])white\1/i.test(svgContent)
    || /stroke=(['"])white\1/i.test(svgContent);
  return usesWhiteOnly && !hasThemeDrivenColor && !hasNonWhiteColor;
}

function looksLikeDenseHeading(text) {
  return String(text || "").replace(/\s+/g, "").length >= 18;
}

function countFrameBearingBlocks(articleHtml) {
  return [
    "wx-intro-card",
    "wx-summary-card",
    "wx-quote-card",
    "wx-inline-graphic",
    "wx-badge-art",
  ].reduce((sum, className) => sum + countClassToken(articleHtml, className), 0);
}

function hasTextualStructure(fragment) {
  if (!fragment) return false;
  if (!/<(?:p|ul|ol|blockquote|table|figure)\b/i.test(fragment)) return false;
  return extractReadableText(fragment).length > 0;
}

function inlineGraphicInterruptsCopy(bodyBlock, inlineBlock) {
  if (!bodyBlock || !inlineBlock) return false;
  const index = bodyBlock.indexOf(inlineBlock);
  if (index === -1) return false;
  const before = bodyBlock.slice(0, index);
  const after = bodyBlock.slice(index + inlineBlock.length);
  return hasTextualStructure(before) && hasTextualStructure(after);
}

function collectFreeHeroArtBlocks(articleHtml) {
  return collectBalancedBlocksByClass(articleHtml, "tp-free-hero-art", ["div", "figure"]);
}

function collectFreeDividerBlocks(articleHtml) {
  return collectBalancedBlocksByClass(articleHtml, "tp-free-divider", ["div", "hr"]);
}

function collectFreeInfographicBlocks(articleHtml) {
  return [
    ...collectBalancedBlocksByClass(articleHtml, "tp-free-panel", ["section", "div", "aside"]),
    ...collectBalancedBlocksByClass(articleHtml, "tp-free-note", ["section", "div", "aside"]),
    ...collectBalancedBlocksByClass(articleHtml, "tp-free-quote", ["blockquote", "div"]),
  ].filter((block) => /data-svg-role=(['"])inline-infographic\1/i.test(block));
}

function stashMatches(htmlContent, regex, label) {
  const stash = [];
  const html = htmlContent.replace(regex, (match) => {
    const token = `__TP_${label}_${stash.length}__`;
    stash.push(match);
    return token;
  });
  return { html, stash };
}

function restoreStashedMatches(htmlContent, label, stash) {
  let nextHtml = htmlContent;
  stash.forEach((match, index) => {
    nextHtml = nextHtml.replace(`__TP_${label}_${index}__`, match);
  });
  return nextHtml;
}

function stripStandaloneSvgMarkup(htmlContent, protectedPatterns = []) {
  let working = htmlContent;
  const stashes = [];

  protectedPatterns.forEach((pattern, index) => {
    const label = `SVG_PROTECT_${index}`;
    const result = stashMatches(working, pattern, label);
    stashes.push({ label, stash: result.stash });
    working = result.html;
  });

  working = working.replace(/<svg\b[\s\S]*?<\/svg>/gi, "");

  for (let i = stashes.length - 1; i >= 0; i--) {
    working = restoreStashedMatches(working, stashes[i].label, stashes[i].stash);
  }

  return working;
}

function countTagInstances(htmlContent, tagName) {
  return (String(htmlContent || "").match(new RegExp(`<${tagName}\\b`, "gi")) || []).length;
}

function countTextClusterTags(htmlContent) {
  return (String(htmlContent || "").match(/<(?:p|ul|ol|blockquote|table|figure)\b/gi) || []).length;
}

function looksLikeExplanatoryZone(text) {
  return /方法|流程|步骤|对比|路径|结构|框架|总结|复盘|说明|依据|方法论|method|process|workflow|compare|path|structure|summary|recap|explain|evidence/i.test(text || "");
}

function canPromoteFreeBlockToInfographic(blockHtml) {
  const svgCount = countTagInstances(blockHtml, "svg");
  const paragraphCount = countTagInstances(blockHtml, "p");
  const readableText = extractReadableText(blockHtml);
  return svgCount === 1
    && paragraphCount <= 1
    && countTextClusterTags(blockHtml) <= 2
    && readableText.length <= 220
    && looksLikeExplanatoryZone(readableText);
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
  const styleArchetype = getArticleArchetype(articleHtml);
  const declaredSvgGrammar = getArticleSvgGrammar(articleHtml);
  const declaredHeroScene = getArticleHeroScene(articleHtml);
  const declaredReadingPriority = getArticleReadingPriority(articleHtml);
  const declaredSceneDensity = getArticleSceneDensity(articleHtml);
  const declaredMarkProminence = getArticleMarkProminence(articleHtml);
  const declaredHeroAnchor = getArticleHeroAnchor(articleHtml);
  const declaredMarkPlacement = getArticleMarkPlacement(articleHtml);
  const declaredGraphicQuietness = getArticleGraphicQuietness(articleHtml);
  const declaredTitleSafe = getArticleTitleSafe(articleHtml);
  const declaredFrameBudget = getArticleFrameBudget(articleHtml);
  const declaredSvgNoiseBudget = getArticleSvgNoiseBudget(articleHtml);
  const uiMode = /data-ui-mode=(['"])free\1/i.test(articleHtml) ? "free" : "rule";
  const contentTemplate = detectContentTemplate(articleHtml);
  const contentRule = CONTENT_TEMPLATE_RULES[contentTemplate] || CONTENT_TEMPLATE_RULES["knowledge-article"];
  const componentCounts = summarizeComponentCounts(articleHtml);
  const headingAudit = buildHeadingAudit(articleHtml, pageTone);
  const warnings = [...headingAudit.warnings];
  const errors = [...headingAudit.errors];
  const sectionHeadingBlocks = collectBalancedBlocksByClass(articleHtml, "wx-section-heading", ["div"]);
  const deepHeadingWrapperCount = sectionHeadingBlocks.filter((block) => {
    const nestedDivs = (block.match(/<div\b/gi) || []).length;
    return nestedDivs > 3;
  }).length;
  const inlineSvgCount = (articleHtml.match(/<svg\b/gi) || []).length;
  const semanticIconCount = headingAudit.sections.reduce((sum, section) => sum + (section.icon_count || 0), 0);
  const accountedSemanticSvgCount = headingAudit.section_count + semanticIconCount + componentCounts.inline_graphic + componentCounts.hero;
  const nonSemanticSvgCount = Math.max(0, inlineSvgCount - accountedSemanticSvgCount);
  const dirtyBreakCount = (articleHtml.match(/<(?:div|p|li|blockquote)[^>]*>\s*(?:<br\s*\/?>|\u00a0|&nbsp;)\s*<\/(?:div|p|li|blockquote)>/gi) || []).length;
  const familyVisualSystem = svgGrammar.getFamilyVisualSystem(styleFamily);
  const compositionProfile = svgGrammar.getCompositionProfile(styleFamily);
  const expectedHeroScene = svgGrammar.chooseHeroScene({
    contentTemplate,
    family: styleFamily,
    archetype: styleArchetype,
  });
  const approvedInlineKinds = svgGrammar.getApprovedInfographicKinds(contentTemplate, styleFamily);
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
  const repeatedKinds = new Map();
  const repeatedFingerprints = new Map();
  const conflictingMarkKinds = [];
  const missingMarkKinds = [];
  const oversizedMarks = [];
  const hollowMarkReuses = [];
  const inlineInfographicIssues = [];
  const compositionIssues = [];
  const freeModeSvgIssues = [];

  if (declaredReadingPriority !== compositionProfile.reading_priority) {
    compositionIssues.push(`reading priority should be ${compositionProfile.reading_priority}, found ${declaredReadingPriority || "missing"}`);
  }
  if (declaredSceneDensity !== compositionProfile.scene_density) {
    compositionIssues.push(`scene density should be ${compositionProfile.scene_density}, found ${declaredSceneDensity || "missing"}`);
  }
  if (declaredMarkProminence !== compositionProfile.mark_prominence) {
    compositionIssues.push(`mark prominence should be ${compositionProfile.mark_prominence}, found ${declaredMarkProminence || "missing"}`);
  }
  if (declaredHeroAnchor !== compositionProfile.hero_anchor) {
    compositionIssues.push(`hero anchor should be ${compositionProfile.hero_anchor}, found ${declaredHeroAnchor || "missing"}`);
  }
  if (declaredMarkPlacement !== compositionProfile.mark_placement) {
    compositionIssues.push(`mark placement should be ${compositionProfile.mark_placement}, found ${declaredMarkPlacement || "missing"}`);
  }
  if (declaredGraphicQuietness !== compositionProfile.graphic_quietness) {
    compositionIssues.push(`graphic quietness should be ${compositionProfile.graphic_quietness}, found ${declaredGraphicQuietness || "missing"}`);
  }
  if (declaredTitleSafe !== compositionProfile.title_safe) {
    compositionIssues.push(`title-safe should be ${compositionProfile.title_safe}, found ${declaredTitleSafe || "missing"}`);
  }
  if (declaredFrameBudget !== compositionProfile.frame_budget) {
    compositionIssues.push(`frame-budget should be ${compositionProfile.frame_budget}, found ${declaredFrameBudget || "missing"}`);
  }
  if (declaredSvgNoiseBudget !== compositionProfile.svg_noise_budget) {
    compositionIssues.push(`svg-noise-budget should be ${compositionProfile.svg_noise_budget}, found ${declaredSvgNoiseBudget || "missing"}`);
  }

  const sectionBlocks = collectBalancedBlocksByClass(articleHtml, "wx-section-card", ["div", "section"]);
  sectionBlocks.forEach((sectionBlock, idx) => {
    const headingBlock = collectBalancedBlocksByClass(sectionBlock, "wx-section-heading", ["div"])[0] || "";
    if (!headingBlock) return;
    const captionText = extractReadableText(headingBlock.match(/<[^>]*class=(['"])[^'"]*wx-card-caption[^'"]*\1[^>]*>([\s\S]*?)<\/[^>]+>/i)?.[2] || "");
    const titleText = extractReadableText(headingBlock.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i)?.[1] || "");
    const bodyBlock = collectBalancedBlocksByClass(sectionBlock, "wx-section-body", ["div"])[0] || sectionBlock;
    const bodyText = extractReadableText(bodyBlock);
    const expectedKind = svgGrammar.detectSectionMarkKind({
      caption: captionText,
      title: titleText,
      body: bodyText,
      contentTemplate,
    });
    const markBlock = headingBlock.match(/<span[^>]*class=(['"])[^'"]*wx-section-mark[^'"]*\1[^>]*>[\s\S]*?<\/span>/i)?.[0] || "";
    const markKind = markBlock.match(/data-mark-kind=(['"])([^'"]+)\1/i)?.[2] || null;
    const svgMarkup = markBlock.match(/<svg\b[\s\S]*?<\/svg>/i)?.[0] || "";
    const nodeCount = countSvgNodes(svgMarkup);

    const hasSeparatedTitleRow = /class=(['"])[^'"]*wx-title-row[^'"]*\1/i.test(headingBlock);
    if (declaredMarkPlacement === "title-corner" && looksLikeDenseHeading(titleText) && markBlock && !hasSeparatedTitleRow) {
      compositionIssues.push(`section ${idx + 1} mark intrudes on title flow for a dense heading`);
    }

    if (!markKind) missingMarkKinds.push(idx + 1);
    if (markKind && markKind !== expectedKind) conflictingMarkKinds.push({ section: idx + 1, expected: expectedKind, actual: markKind });
    if (markBlock && !/data-svg-role=(['"])section-mark\1/i.test(markBlock)) {
      compositionIssues.push(`section ${idx + 1} mark is missing data-svg-role="section-mark"`);
    }
    if (markBlock && !new RegExp(`data-mark-prominence=(['"])${compositionProfile.mark_prominence}\\1`, "i").test(markBlock)) {
      compositionIssues.push(`section ${idx + 1} mark prominence does not match article metadata`);
    }
    if (markKind) repeatedKinds.set(markKind, (repeatedKinds.get(markKind) || 0) + 1);
    if (nodeCount > 8) oversizedMarks.push({ section: idx + 1, nodes: nodeCount });
    if (svgMarkup) {
      const fingerprint = fingerprintSvgMarkup(svgMarkup);
      const previous = repeatedFingerprints.get(fingerprint);
      if (previous && previous.kind !== markKind) {
        hollowMarkReuses.push(`section ${idx + 1} reuses ${previous.kind} geometry for ${markKind}`);
      } else if (!previous) {
        repeatedFingerprints.set(fingerprint, { kind: markKind, section: idx + 1 });
      }
    }
  });

  const duplicateKinds = [...repeatedKinds.entries()].filter((entry) => entry[1] >= 4);
  const heroMeshBlock = collectBalancedBlocksByClass(articleHtml, "wx-hero-mesh", ["div"])[0] || "";
  const heroSvg = heroMeshBlock.match(/<svg\b[\s\S]*?<\/svg>/i)?.[0] || "";
  const heroNodeCount = countSvgNodes(heroSvg);
  const heroRoleHitsOutsideHero = (articleHtml.match(/data-svg-role=(['"])hero-scene\1/gi) || []).length
    - (heroMeshBlock ? 1 : 0)
    - (heroSvg ? 1 : 0);
  const inlineBlocks = articleHtml.match(/<div[^>]*class=(['"])[^'"]*wx-inline-graphic[^'"]*\1[^>]*>[\s\S]*?<\/div>/gi) || [];
  const bodyBlocks = collectBalancedBlocksByClass(articleHtml, "wx-section-body", ["div"]);
  const heroTitleText = extractReadableText(articleHtml.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "");
  const frameBearingBlockCount = countFrameBearingBlocks(articleHtml);

  if (declaredTitleSafe === "strict" && heroMeshBlock && heroNodeCount > Math.max(8, svgGrammar.getHeroNodeBudget(compositionProfile) - 1)) {
    compositionIssues.push(`title-safe failed: hero scene is too present for a strict title-safe profile (${heroNodeCount} nodes)`);
  }
  if (
    declaredTitleSafe === "strict"
    && looksLikeDenseHeading(heroTitleText)
    && ["frame", "top-right"].includes(declaredHeroAnchor || "")
    && heroSvg
    && heroNodeCount > Math.max(4, Math.floor(svgGrammar.getHeroNodeBudget(compositionProfile) * 0.5))
  ) {
    compositionIssues.push(`title-safe failed: dense hero title should not pair with hero anchor ${declaredHeroAnchor}`);
  }
  if (declaredFrameBudget === "single" && frameBearingBlockCount > 3) {
    compositionIssues.push(`frame-budget exceeded: found ${frameBearingBlockCount} secondary frame zones in a single-frame layout`);
  }
  if (declaredSvgNoiseBudget === "tight" && inlineBlocks.length > 1) {
    inlineInfographicIssues.push("svg-noise-budget exceeded: tight layouts should not carry more than one inline infographic");
  }
  if (heroSvg && svgLooksLowContrast(heroSvg)) {
    warnings.push("decorative SVG looks visually ineffective: hero scene relies on low-contrast strokes");
  }
  inlineBlocks.forEach((block, idx) => {
    const kind = block.match(/data-infographic-kind=(['"])([^'"]+)\1/i)?.[2] || null;
    const svgMarkup = block.match(/<svg\b[\s\S]*?<\/svg>/i)?.[0] || "";
    const nodeCount = countSvgNodes(svgMarkup);
    const containingBody = collectBalancedBlocksByClass(articleHtml, "wx-section-body", ["div"]).find((bodyBlock) => bodyBlock.includes(block)) || "";
    if (!kind) inlineInfographicIssues.push(`inline graphic ${idx + 1} is missing data-infographic-kind`);
    if (!/data-svg-role=(['"])inline-infographic\1/i.test(block)) {
      inlineInfographicIssues.push(`inline graphic ${idx + 1} is missing data-svg-role="inline-infographic"`);
    }
    if (kind && approvedInlineKinds.length > 0 && !approvedInlineKinds.includes(kind)) {
      inlineInfographicIssues.push(`inline graphic ${idx + 1} uses unapproved kind ${kind} for ${contentTemplate}/${styleFamily || "default"}`);
    }
    if (svgMarkup && kind && !new RegExp(`data-infographic-template=(['"])${kind}\\1`, "i").test(svgMarkup)) {
      inlineInfographicIssues.push(`inline graphic ${idx + 1} is not coming from the approved infographic registry`);
    }
    if (nodeCount > svgGrammar.getInlineInfographicNodeBudget(compositionProfile)) {
      inlineInfographicIssues.push(`inline graphic ${idx + 1} is too complex (${nodeCount} nodes)`);
    }
    if (svgMarkup && (nodeCount < 2 || svgLooksLowContrast(svgMarkup))) {
      inlineInfographicIssues.push(`inline graphic ${idx + 1} is decorative but visually ineffective`);
    }
    if (containingBody && inlineGraphicInterruptsCopy(containingBody, block)) {
      inlineInfographicIssues.push(`inline graphic ${idx + 1} interrupts continuous body copy`);
    }
  });

  if (pageTone === "event-notice" && headingSystem !== "index-led") {
    errors.push("event-notice page should use data-heading-system=\"index-led\"");
  }

  if (uiMode === "free" && (!freeHelpers.includes("tp-free-shell") || freeHelpers.length < 3)) {
    errors.push("free mode should start from tp-free-shell plus at least two other tp-free-* helpers");
  }

  if (uiMode === "free" && hardcodedColorTokens.length > 0) {
    errors.push(`free mode uses hardcoded theme colors (${hardcodedColorTokens.join(", ")})`);
  }

  if (uiMode === "rule" && styleFamily && declaredSvgGrammar !== familyVisualSystem.svg_grammar) {
    errors.push(`svg grammar should be ${familyVisualSystem.svg_grammar || "defined"} for ${styleFamily || "the current family"}`);
  }
  if (uiMode === "rule" && compositionIssues.length > 0) {
    errors.push(...compositionIssues);
  }

  if (uiMode === "rule" && styleFamily && declaredHeroScene !== expectedHeroScene) {
    errors.push(`hero scene should be ${expectedHeroScene} for ${contentTemplate}/${styleFamily || "default"}`);
  }
  if (uiMode === "rule" && heroMeshBlock && !/data-svg-role=(['"])hero-scene\1/i.test(heroMeshBlock)) {
    errors.push("hero mesh is missing data-svg-role=\"hero-scene\"");
  }
  if (uiMode === "rule" && heroMeshBlock && !new RegExp(`data-scene-density=(['"])${compositionProfile.scene_density}\\1`, "i").test(heroMeshBlock)) {
    errors.push("hero mesh scene density metadata does not match article metadata");
  }
  if (uiMode === "rule" && heroMeshBlock && !new RegExp(`data-reading-priority=(['"])${compositionProfile.reading_priority}\\1`, "i").test(heroMeshBlock)) {
    errors.push("hero mesh reading-priority metadata does not match article metadata");
  }
  if (heroSvg && declaredHeroScene && !new RegExp(`data-scene-template=(['"])${declaredHeroScene}\\1`, "i").test(heroSvg)) {
    errors.push("hero scene SVG is not using the registered scene template");
  }
  if (heroSvg && !/data-svg-role=(['"])hero-scene\1/i.test(heroSvg)) {
    errors.push("hero scene SVG is missing data-svg-role=\"hero-scene\"");
  }
  if (uiMode === "rule" && heroRoleHitsOutsideHero > 0) {
    errors.push("hero-scene role is leaking outside wx-hero-mesh");
  }
  if (heroNodeCount > svgGrammar.getHeroNodeBudget(compositionProfile)) {
    warnings.push(`hero scene is too noisy for the current composition profile (${heroNodeCount} nodes)`);
  }
  if (heroSvg && heroNodeCount < 2) {
    warnings.push("hero scene still looks like a generic mesh rather than a registered semantic scene");
  }

  bodyBlocks.forEach((bodyBlock, idx) => {
    if (/\bwx-section-mark\b/.test(bodyBlock)) {
      errors.push(`section ${idx + 1} body contains wx-section-mark`);
    }
    const strippedBody = stripStandaloneSvgMarkup(bodyBlock, [
      /<div[^>]*class=(['"])[^'"]*wx-inline-graphic[^'"]*\1[^>]*>[\s\S]*?<\/div>/gi,
    ]);
    if (/<svg\b/i.test(strippedBody)) {
      warnings.push(`section ${idx + 1} body contains standalone SVG outside wx-inline-graphic`);
    }
  });

  if (componentCounts.image_drop_zone > 0 && ["event-notice", "weekly-report", "knowledge-article", "case-recap"].includes(contentTemplate)) {
    errors.push("delivery page still contains wx-image-drop-zone; use native images instead");
  }

  if (styleFamily && sharedFamilyMatrix.READING_PRIORITY_FAMILIES.has(styleFamily)) {
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

  if (deepHeadingWrapperCount > 0) {
    warnings.push(`${deepHeadingWrapperCount} section heading(s) still use overly deep wrapper structure`);
  }
  if (dirtyBreakCount > 0) {
    warnings.push(`${dirtyBreakCount} empty block(s) still rely on raw br/div placeholders`);
  }
  if (uiMode === "rule" && nonSemanticSvgCount > 1) {
    warnings.push("rule-mode page still contains multiple non-semantic inline SVG blocks");
  }
  const dividerBlocks = articleHtml.match(/<div[^>]*class=(['"])[^'"]*wx-divider-ornament[^'"]*\1[^>]*>[\s\S]*?<\/div>/gi) || [];
  dividerBlocks.forEach((block, idx) => {
    if (!/data-svg-role=(['"])divider\1/i.test(block)) {
      warnings.push(`divider ${idx + 1} is missing data-svg-role="divider"`);
    }
  });
  const sectionBodyBlocks = collectBalancedBlocksByClass(articleHtml, "wx-section-body", ["div"]);
  sectionBodyBlocks.forEach((bodyBlock, idx) => {
    if (/\bwx-divider-ornament\b/.test(bodyBlock)) {
      warnings.push(`divider is placed inside section body ${idx + 1}`);
    }
  });
  if (typeof contentRule.max_inline_infographics === "number" && componentCounts.inline_graphic > contentRule.max_inline_infographics) {
    warnings.push(`${contentTemplate} exceeds the recommended inline infographic count (${componentCounts.inline_graphic}/${contentRule.max_inline_infographics})`);
  }
  if (contentRule.allowBadgeArt === false && componentCounts.badge_art > 0) {
    errors.push(`${contentTemplate} should not use wx-badge-art`);
  }
  if (missingMarkKinds.length > 0) {
    errors.push(`section ${missingMarkKinds.join(", ")} is missing data-mark-kind`);
  }
  if (conflictingMarkKinds.length > 0) {
    conflictingMarkKinds.forEach((item) => {
      errors.push(`section ${item.section} mark kind conflicts with heading semantics (${item.actual} vs ${item.expected})`);
    });
  }
  if (duplicateKinds.length > 0) {
    warnings.push(`multiple sections reuse the same mark kind (${duplicateKinds.map((entry) => entry[0]).join(", ")})`);
  }
  if (oversizedMarks.length > 0) {
    warnings.push(`${oversizedMarks.length} section mark(s) are too complex for a small semantic badge`);
  }
  if (hollowMarkReuses.length > 0) {
    warnings.push(...hollowMarkReuses);
  }
  if (inlineInfographicIssues.length > 0) {
    warnings.push(...inlineInfographicIssues);
  }

  if (uiMode === "free") {
    const freeHeroArts = collectFreeHeroArtBlocks(articleHtml);
    const freeDividers = collectFreeDividerBlocks(articleHtml);
    const freeInfographics = collectFreeInfographicBlocks(articleHtml);
    const totalSvgCount = (articleHtml.match(/<svg\b/gi) || []).length;
    if (freeHeroArts.length > 1) {
      freeModeSvgIssues.push("free mode uses more than one tp-free-hero-art block");
    }
    freeHeroArts.forEach((block, idx) => {
      const freeHeroBlock = collectBalancedBlocksByClass(articleHtml, "tp-free-hero", ["section", "div"]).find((heroBlock) => heroBlock.includes(block));
      if (!freeHeroBlock) {
        freeModeSvgIssues.push(`tp-free-hero-art ${idx + 1} is outside tp-free-hero`);
      }
      if (!/data-svg-role=(['"])hero-scene\1/i.test(block)) {
        freeModeSvgIssues.push(`tp-free-hero-art ${idx + 1} is missing data-svg-role="hero-scene"`);
      }
      const svgMarkup = block.match(/<svg\b[\s\S]*?<\/svg>/i)?.[0] || "";
      const nodeCount = countSvgNodes(svgMarkup);
      if (nodeCount > svgGrammar.getHeroNodeBudget(compositionProfile) + 2) {
        freeModeSvgIssues.push(`tp-free-hero-art ${idx + 1} is too noisy (${nodeCount} nodes)`);
      }
    });
    freeDividers.forEach((block, idx) => {
      if (!/data-svg-role=(['"])divider\1/i.test(block)) {
        freeModeSvgIssues.push(`tp-free-divider ${idx + 1} is missing data-svg-role="divider"`);
      }
    });
    if (freeInfographics.length > 1) {
      freeModeSvgIssues.push("free mode uses multiple independent infographic SVG zones");
    }
    freeInfographics.forEach((block, idx) => {
      if (!/\b(?:tp-free-panel|tp-free-note|tp-free-quote)\b/.test(block)) {
        freeModeSvgIssues.push(`free infographic ${idx + 1} is not placed in an independent explanatory block`);
      }
      if (!canPromoteFreeBlockToInfographic(block)) {
        freeModeSvgIssues.push(`free infographic ${idx + 1} is too decorative or text-heavy for the reading lane`);
      }
    });
    if (totalSvgCount > freeHeroArts.length + freeDividers.length + freeInfographics.length) {
      freeModeSvgIssues.push("free mode contains SVG outside hero/divider/explanatory zones");
    }
  }
  if (freeModeSvgIssues.length > 0) {
    errors.push(...freeModeSvgIssues);
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
    svg_grammar: declaredSvgGrammar,
    hero_scene: declaredHeroScene,
    reading_priority: declaredReadingPriority,
    scene_density: declaredSceneDensity,
    mark_prominence: declaredMarkProminence,
    hero_anchor: declaredHeroAnchor,
    mark_placement: declaredMarkPlacement,
    graphic_quietness: declaredGraphicQuietness,
    component_counts: componentCounts,
    heading_audit: headingAudit,
    deep_heading_wrapper_count: deepHeadingWrapperCount,
    dirty_break_count: dirtyBreakCount,
    non_semantic_svg_count: nonSemanticSvgCount,
    duplicate_mark_kinds: duplicateKinds.map((entry) => ({ kind: entry[0], count: entry[1] })),
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
  const freeHeroArts = collectFreeHeroArtBlocks(articleHtml);
  const freeDividers = collectFreeDividerBlocks(articleHtml);
  const totalSvgCount = (articleHtml.match(/<svg\b/gi) || []).length;
  const freeModeOk = uiMode !== "free" || (
    freeHelpers.includes("tp-free-shell")
    && freeHelpers.length >= 3
    && hardcodedColorTokens.length === 0
    && freeHeroArts.length <= 1
    && totalSvgCount <= freeHeroArts.length + freeDividers.length
  );
  const designAudit = buildDesignAudit(articleHtml);
  const editorBundle = fs.readFileSync(path.join(SKILL_DIR, "assets", "editor-stable.js"), "utf-8");
  const imageFrames = collectBalancedBlocksByClass(articleHtml, "wx-media-frame", ["figure", "div"]);
  const imageWidths = imageFrames
    .map((block) => block.match(/data-image-width=(['"])([^'"]+)\1/i)?.[2] || null)
    .filter(Boolean);
  const templateRegistryEnabled = /cloneTemplateBlock|tp-template-registry/.test(editorBundle) && !/function buildTemplateMarkup/.test(editorBundle);
  const exportFormatsEnabled = /data-format="jpg"/.test(editorBundle) && /data-format="png"/.test(editorBundle) && /currentExportFormat/.test(editorBundle);

  const structure = {
    path: absolutePath,
    article_count: articleCount,
    has_document_tags: /<(?:html|head|body)\b/i.test(raw),
    ui_mode: uiMode,
    preset: articleHtml.match(/data-preset=(['"])([^'"]+)\1/i)?.[2] || null,
    style_family: articleHtml.match(/data-style-family=(['"])([^'"]+)\1/i)?.[2] || null,
    style_archetype: articleHtml.match(/data-style-archetype=(['"])([^'"]+)\1/i)?.[2] || null,
    svg_grammar: getArticleSvgGrammar(articleHtml),
    hero_scene: getArticleHeroScene(articleHtml),
    reading_priority: getArticleReadingPriority(articleHtml),
    scene_density: getArticleSceneDensity(articleHtml),
    mark_prominence: getArticleMarkProminence(articleHtml),
    hero_anchor: getArticleHeroAnchor(articleHtml),
    mark_placement: getArticleMarkPlacement(articleHtml),
    graphic_quietness: getArticleGraphicQuietness(articleHtml),
    page_tone: designAudit.page_tone,
    content_template: designAudit.content_template,
    heading_system: designAudit.heading_system,
    divider_count: dividerCount,
    image_block_count: imageFrames.length,
    image_widths: imageWidths,
    template_registry_enabled: templateRegistryEnabled,
    export_formats_enabled: exportFormatsEnabled,
    uses_free_helpers: freeHelpers.length > 0,
    free_helpers_found: freeHelpers,
  };

  const design = {
    score: designAudit.score,
    warnings: designAudit.warnings,
    errors: designAudit.errors,
    hardcoded_color_tokens: hardcodedColorTokens,
    risky_grid_templates: riskyGrids,
    design_audit: designAudit,
  };

  return {
    path: absolutePath,
    ok: articleCount === 1 && freeModeOk && designAudit.errors.length === 0,
    structure,
    design,
    article_count: structure.article_count,
    has_document_tags: structure.has_document_tags,
    ui_mode: structure.ui_mode,
    preset: structure.preset,
    style_family: structure.style_family,
    style_archetype: structure.style_archetype,
    page_tone: structure.page_tone,
    content_template: structure.content_template,
    divider_count: structure.divider_count,
    uses_free_helpers: structure.uses_free_helpers,
    free_helpers_found: structure.free_helpers_found,
    hardcoded_color_tokens: design.hardcoded_color_tokens,
    risky_grid_templates: design.risky_grid_templates,
    design_audit: designAudit,
  };
}

function buildArchitectureAdvice(htmlDiagnosis, buildStatus) {
  const advice = [];

  if (buildStatus && (!buildStatus.cssInSync || !buildStatus.editorStableInSync || !buildStatus.editorCompatInSync)) {
    advice.push("assets 与 src 源码层不同步，先运行 scripts/build-assets.js 重新生成内联产物。");
  }

  if (htmlDiagnosis?.design?.errors?.length) {
    advice.push("当前页面存在结构或审美错误，建议先修正文档结构，再继续做风格微调。");
  } else if (htmlDiagnosis?.design?.warnings?.length) {
    advice.push("当前页面主要是设计层警告，优先收紧标题密度、卡片标题长度和图形使用量。");
  }

  if (htmlDiagnosis?.structure?.image_block_count && htmlDiagnosis.structure.image_widths.length === 0) {
    advice.push("检测到图片块但未写入 data-image-width，建议重新保存页面以固化图片尺寸状态。");
  }

  if (htmlDiagnosis?.structure?.content_template && !CONTENT_TEMPLATE_RULES[htmlDiagnosis.structure.content_template]) {
    advice.push("当前页面模板没有命中内置规则，建议补充 content-template 配置再扩展组件。");
  }

  if (
    htmlDiagnosis?.structure
    && htmlDiagnosis.structure.ui_mode !== "free"
    && (!htmlDiagnosis.structure.svg_grammar || !htmlDiagnosis.structure.hero_scene)
  ) {
    advice.push("当前页面缺少 SVG grammar 元数据，建议先通过 render-image 规范化 hero scene 与章节语义徽记。");
  }

  if (htmlDiagnosis?.structure && !htmlDiagnosis.structure.template_registry_enabled) {
    advice.push("插块仍未完全切到模板注册表，建议优先移除遗留字符串模板分支。");
  }

  if (htmlDiagnosis?.structure && !htmlDiagnosis.structure.export_formats_enabled) {
    advice.push("导出面板尚未同时提供 JPG 和 PNG，建议补齐发布/保真双格式出口。");
  }

  return advice;
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
  const buildStatus = getBuildStatus(SKILL_DIR);
  const environment = {
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
    presets: presetCounts,
    build: {
      css_in_sync: buildStatus.cssInSync,
      editor_stable_in_sync: buildStatus.editorStableInSync,
      editor_compat_in_sync: buildStatus.editorCompatInSync,
      css_source_files: CSS_SOURCE_FILES.length,
      editor_source_files: EDITOR_SOURCE_FILES.length,
    },
  };

  console.log(JSON.stringify({
    skill_dir: SKILL_DIR,
    settings_path: SETTINGS_PATH,
    version: readVersion(),
    environment,
    structure: htmlDiagnosis ? htmlDiagnosis.structure : null,
    design: htmlDiagnosis ? htmlDiagnosis.design : null,
    architecture_advice: buildArchitectureAdvice(htmlDiagnosis, buildStatus),
    ui: settings.ui,
    openclaw: environment.openclaw,
    logo: environment.logo,
    chrome: environment.chrome,
    ...presetCounts,
    html_diagnosis: htmlDiagnosis,
  }, null, 2));
}

main();
