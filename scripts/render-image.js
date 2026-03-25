#!/usr/bin/env node

/**
 * render-image.js — Tianphoto: Article HTML → Standalone Page + optional PNG
 *
 * Usage:
 *   node render-image.js <html-file> [options]
 *
 * Options:
 *   --output <dir>        Output directory (default: ~/Desktop/tianphoto-iterations)
 *   --preset <id>         Preset ID from presets.json (overrides HTML preset)
 *   --logo <path>         Path to logo image to inject into brand banner
 *   --logo-title <text>   Override logo title text
 *   --logo-subtitle <text>  Override logo subtitle text
 *   --logo-enabled <bool> Force enable/disable logo banner
 *   --png                 Also export PNG (uses system Chrome, no npm install needed)
 *   --slice-height <px>   Max slice height for PNG (default: 1520, 0 = no slice)
 *
 * Default behavior: generates a self-contained .html file that can be opened
 * in any browser for viewing and editing. Add --png to also export images.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execSync } = require("child_process");
const { loadSettings } = require("./settings");
const htmlHelpers = require("./lib/html-helpers");
const {
  CONTENT_TEMPLATE_RULES,
  CONTENT_TEMPLATE_PATTERNS: SHARED_CONTENT_TEMPLATE_PATTERNS,
} = require("./lib/content-template-rules");
const sharedFamilyMatrix = require("./lib/family-matrix");
const svgGrammar = require("./lib/svg-grammar");
const { ensureBundledAssets } = require("./lib/build-assets");

const SKILL_DIR = path.resolve(__dirname, "..");
const CSS_PATH = path.join(SKILL_DIR, "assets", "article-theme.css");
const FREE_CSS_PATH = path.join(SKILL_DIR, "assets", "free-base.css");
const PRESETS_PATH = path.join(SKILL_DIR, "assets", "presets.json");
const DEFAULT_OUTPUT_DIR = path.join(os.homedir(), "Desktop", "tianphoto-iterations");

function buildTimestampLabel(date = new Date()) {
  const parts = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    "-",
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0"),
  ];
  return parts.join("");
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    } else {
      args._.push(argv[i]);
    }
  }
  return args;
}

function loadPreset(presetsData, presetId, htmlContent) {
  if (presetId) {
    const p = presetsData.presets.find((p) => p.id === presetId);
    if (p) return p;
  }
  const match = htmlContent.match(/data-preset=(['"])([^'"]+)\1/i);
  if (match) {
    const p = presetsData.presets.find((p) => p.id === match[2]);
    if (p) return p;
  }
  return presetsData.presets[0];
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return null;
}

function stripDoctype(htmlContent) {
  return htmlHelpers.stripDoctype(htmlContent);
}

function extractTagInnerHtml(htmlContent, tagName) {
  return htmlHelpers.extractTagInnerHtml(htmlContent, tagName);
}

function extractFirstArticle(htmlContent) {
  return htmlHelpers.extractFirstArticle(htmlContent);
}

function sanitizeArticleFragment(htmlContent) {
  const normalized = htmlHelpers.sanitizeArticleFragment(htmlContent);
  if (/<\/?(?:html|head|body)\b/i.test(normalized.html)) {
    throw new Error(
      "Input HTML still contains document-level tags after sanitization. " +
      "Provide a single <article> fragment or a saved Tianphoto page."
    );
  }
  if (!normalized.hasArticleRoot || normalized.articleCount !== 1) {
    throw new Error(`Input HTML must contain exactly one <article> root; found ${normalized.articleCount}.`);
  }
  return {
    html: normalized.html,
    hadOuterDocument: normalized.hadOuterDocument,
  };
}

const DIVIDER_VARIANT_SVGS = {
  "editorial-notch": '<svg viewBox="0 0 220 20" fill="none" aria-hidden="true"><path d="M18 10h78M124 10h78" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity=".26"/><path d="M110 5.5 114.5 10 110 14.5 105.5 10Z" fill="currentColor" opacity=".5"/></svg>',
  "soft-stars": '<svg viewBox="0 0 220 28" fill="none" aria-hidden="true"><path d="M6 14h72M142 14h72" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity=".5"/><path d="m102 7 2.5 5.5L110 15l-5.5 2.5L102 23l-2.5-5.5L94 15l5.5-2.5L102 7Zm16-3 2.2 4.8L125 11l-4.8 2.2L118 18l-2.2-4.8L111 11l4.8-2.2L118 4Z" fill="currentColor"/></svg>',
  "chevron-band": '<svg viewBox="0 0 220 28" fill="none" aria-hidden="true"><path d="M8 14h66l12-8 12 8 12-8 12 8h90" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  "fold-divider": '<svg viewBox="0 0 220 28" fill="none" aria-hidden="true"><path d="M8 14h78l16-8 16 8 16-8 16 8h62" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" opacity=".76"/><circle cx="110" cy="14" r="3.5" fill="currentColor"/></svg>',
  "line-orbit": '<svg viewBox="0 0 220 28" fill="none" aria-hidden="true"><path d="M4 14h70M146 14h70" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><circle cx="110" cy="14" r="10" stroke="currentColor" stroke-width="2.5"/><circle cx="110" cy="14" r="3.5" fill="currentColor"/></svg>',
};

function getArticleSkin(htmlContent) {
  const match = htmlContent.match(/class=(['"])([^'"]*style-skin-([a-z-]+)[^'"]*)\1/i);
  return match ? match[3] : null;
}

function getArticleFamily(htmlContent) {
  const match = htmlContent.match(/data-style-family=(['"])([^'"]+)\1/i);
  return match ? match[2] : null;
}

function getArticleArchetype(htmlContent) {
  const match = htmlContent.match(/data-style-archetype=(['"])([^'"]+)\1/i);
  return match ? match[2] : null;
}

function getArticleHeadingSystem(htmlContent) {
  const match = htmlContent.match(/data-heading-system=(['"])([^'"]+)\1/i);
  return match ? match[2] : null;
}

function getArticlePageTone(htmlContent) {
  const match = htmlContent.match(/data-page-tone=(['"])([^'"]+)\1/i);
  return match ? match[2] : null;
}

function getArticleContentTemplate(htmlContent) {
  const match = htmlContent.match(/data-content-template=(['"])([^'"]+)\1/i);
  return match ? match[2] : null;
}

function extractReadableText(htmlContent) {
  return htmlHelpers.extractReadableText(htmlContent);
}

const CONTENT_TEMPLATE_PATTERNS = SHARED_CONTENT_TEMPLATE_PATTERNS;

function scoreTemplatePatterns(text, patterns) {
  return patterns.reduce((score, token) => {
    const matches = text.match(new RegExp(token, "gi"));
    return score + (matches ? matches.length : 0);
  }, 0);
}

function detectContentTemplate(htmlContent, preset) {
  const existing = getArticleContentTemplate(htmlContent);
  if (existing) return existing;

  const pageTone = getArticlePageTone(htmlContent);
  if (pageTone === "event-notice") return "event-notice";

  const family = preset?.family || getArticleFamily(htmlContent);
  const titleText = extractReadableText(htmlContent.match(/<h1\b[\s\S]*?<\/h1>/i)?.[0] || "");
  const leadText = extractReadableText(htmlContent.match(/<p\b[^>]*class=(['"])[^'"]*wx-lead[^'"]*\1[\s\S]*?<\/p>/i)?.[0] || "");
  const fullText = extractReadableText(htmlContent);

  let bestId = null;
  let bestScore = 0;

  CONTENT_TEMPLATE_PATTERNS.forEach((entry) => {
    const score = scoreTemplatePatterns(titleText, entry.tokens) * 3
      + scoreTemplatePatterns(leadText, entry.tokens) * 2
      + scoreTemplatePatterns(fullText, entry.tokens);
    if (score > bestScore) {
      bestScore = score;
      bestId = entry.id;
    }
  });

  if (bestId && bestScore > 0) return bestId;
  if (PRODUCT_FAMILIES.has(family)) return "release-brief";
  if (READING_PRIORITY_FAMILIES.has(family)) return "knowledge-article";
  return "case-recap";
}

const READING_PRIORITY_FAMILIES = sharedFamilyMatrix.READING_PRIORITY_FAMILIES;
const PRODUCT_FAMILIES = sharedFamilyMatrix.PRODUCT_FAMILIES;
const EXPRESSIVE_FAMILIES = sharedFamilyMatrix.EXPRESSIVE_FAMILIES;
const FAMILY_HEADING_SYSTEMS = sharedFamilyMatrix.FAMILY_HEADING_SYSTEMS;
const FAMILY_VISUAL_SYSTEMS = sharedFamilyMatrix.FAMILY_VISUAL_SYSTEMS;

function getRecommendedHeadingSystem(preset, htmlContent = "", contentTemplate = "") {
  const pageTone = getArticlePageTone(htmlContent);
  if (pageTone === "event-notice" || contentTemplate === "event-notice") {
    return CONTENT_TEMPLATE_RULES["event-notice"]?.preferredHeadingSystem || "index-led";
  }
  return FAMILY_HEADING_SYSTEMS[preset?.family] || "icon-led";
}

function getArticleUiMode(htmlContent) {
  return /data-ui-mode=(['"])free\1/i.test(htmlContent) ? "free" : "rule";
}

function upsertAttribute(attrs, name, value) {
  const sanitizedValue = escapeHtml(String(value));
  const regex = new RegExp(`\\s${name}=(['"])[^'"]*\\1`, "i");
  if (regex.test(attrs)) {
    return attrs.replace(regex, ` ${name}="${sanitizedValue}"`);
  }
  return `${attrs} ${name}="${sanitizedValue}"`;
}

function upsertClassTokens(attrs, tokens, replaceMatchers = []) {
  const classMatch = attrs.match(/\sclass=(['"])([^'"]*)\1/i);
  const existingTokens = classMatch
    ? classMatch[2].split(/\s+/).map((token) => token.trim()).filter(Boolean)
    : [];

  const filtered = existingTokens.filter((token) => (
    !replaceMatchers.some((matcher) => matcher.test(token))
    && !tokens.includes(token)
  ));
  const nextTokens = [...tokens.filter(Boolean), ...filtered];
  const classAttr = ` class="${nextTokens.join(" ")}"`;

  if (classMatch) {
    return attrs.replace(/\sclass=(['"])[^'"]*\1/i, classAttr);
  }
  return `${attrs}${classAttr}`;
}

function upsertDataAttrOnTag(tagHtml, attrName, value) {
  if (!tagHtml) return tagHtml;
  if (value === null || value === undefined || value === "") return tagHtml;
  return tagHtml.replace(/<([a-z0-9-]+)\b([^>]*)>/i, (_match, tagName, attrs) => {
    return `<${tagName}${upsertAttribute(attrs, attrName, value)}>`;
  });
}

function replaceFirstExact(htmlContent, target, replacement) {
  const index = htmlContent.indexOf(target);
  if (index === -1) return htmlContent;
  return htmlContent.slice(0, index) + replacement + htmlContent.slice(index + target.length);
}

function getArticleSvgGrammar(htmlContent) {
  const match = htmlContent.match(/data-svg-grammar=(['"])([^'"]+)\1/i);
  return match ? match[2] : null;
}

function getArticleHeroScene(htmlContent) {
  const match = htmlContent.match(/data-hero-scene=(['"])([^'"]+)\1/i);
  return match ? match[2] : null;
}

function getArticleReadingPriority(htmlContent) {
  const match = htmlContent.match(/data-reading-priority=(['"])([^'"]+)\1/i);
  return match ? match[2] : null;
}

function getArticleSceneDensity(htmlContent) {
  const match = htmlContent.match(/data-scene-density=(['"])([^'"]+)\1/i);
  return match ? match[2] : null;
}

function getArticleMarkProminence(htmlContent) {
  const match = htmlContent.match(/data-mark-prominence=(['"])([^'"]+)\1/i);
  return match ? match[2] : null;
}

function getArticleHeroAnchor(htmlContent) {
  const match = htmlContent.match(/data-hero-anchor=(['"])([^'"]+)\1/i);
  return match ? match[2] : null;
}

function getArticleMarkPlacement(htmlContent) {
  const match = htmlContent.match(/data-mark-placement=(['"])([^'"]+)\1/i);
  return match ? match[2] : null;
}

function getArticleGraphicQuietness(htmlContent) {
  const match = htmlContent.match(/data-graphic-quietness=(['"])([^'"]+)\1/i);
  return match ? match[2] : null;
}

function getArticleTitleSafe(htmlContent) {
  const match = htmlContent.match(/data-title-safe=(['"])([^'"]+)\1/i);
  return match ? match[2] : null;
}

function getArticleFrameBudget(htmlContent) {
  const match = htmlContent.match(/data-frame-budget=(['"])([^'"]+)\1/i);
  return match ? match[2] : null;
}

function getArticleSvgNoiseBudget(htmlContent) {
  const match = htmlContent.match(/data-svg-noise-budget=(['"])([^'"]+)\1/i);
  return match ? match[2] : null;
}

function getCompositionProfileFromPreset(preset, htmlContent = "") {
  const family = preset?.family || getArticleFamily(htmlContent);
  return svgGrammar.getCompositionProfile(family);
}

function stripTags(value) {
  return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
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
  const readableText = stripTags(blockHtml);
  return svgCount === 1
    && paragraphCount <= 1
    && countTextClusterTags(blockHtml) <= 2
    && readableText.length <= 220
    && looksLikeExplanatoryZone(readableText);
}

function annotateFirstSvgRole(blockHtml, svgRole, extraAttrs = {}) {
  return blockHtml.replace(/<svg\b([^>]*)>/i, (_match, attrs) => {
    let nextAttrs = upsertAttribute(attrs, "data-svg-role", svgRole);
    Object.entries(extraAttrs).forEach(([name, value]) => {
      nextAttrs = upsertAttribute(nextAttrs, name, value);
    });
    return `<svg${nextAttrs}>`;
  });
}

function ensureHeroScene(htmlContent, preset) {
  const family = preset?.family || getArticleFamily(htmlContent);
  const contentTemplate = getArticleContentTemplate(htmlContent) || detectContentTemplate(htmlContent, preset);
  const composition = getCompositionProfileFromPreset(preset, htmlContent);
  const heroScene = getArticleHeroScene(htmlContent) || svgGrammar.chooseHeroScene({
    contentTemplate,
    family,
    archetype: preset?.archetype || getArticleArchetype(htmlContent),
  });
  const heroSvg = svgGrammar.buildHeroSceneSvg(heroScene, family);

  let nextHtml = htmlContent.replace(
    /<div([^>]*class=(['"])[^'"]*wx-hero-mesh[^'"]*\2[^>]*)>[\s\S]*?<\/div>/i,
    (match, attrs) => {
      let nextAttrs = upsertAttribute(attrs, "data-hero-scene", heroScene);
      nextAttrs = upsertAttribute(nextAttrs, "data-svg-role", "hero-scene");
      nextAttrs = upsertAttribute(nextAttrs, "data-scene-density", composition.scene_density);
      nextAttrs = upsertAttribute(nextAttrs, "data-reading-priority", composition.reading_priority);
      return `<div${nextAttrs}>${heroSvg}</div>`;
    }
  );

  if (nextHtml === htmlContent) {
    nextHtml = nextHtml.replace(
      /<div([^>]*class=(['"])[^'"]*wx-hero-card[^'"]*\2[^>]*)>/i,
      (match, attrs) => `<div${attrs}>\n  <div class="wx-hero-mesh" data-hero-scene="${heroScene}" data-svg-role="hero-scene" data-scene-density="${composition.scene_density}" data-reading-priority="${composition.reading_priority}">\n    ${heroSvg}\n  </div>`
    );
  }

  return nextHtml;
}

function normalizeSectionMarks(htmlContent, preset) {
  const family = preset?.family || getArticleFamily(htmlContent);
  const contentTemplate = getArticleContentTemplate(htmlContent) || detectContentTemplate(htmlContent, preset);
  const composition = getCompositionProfileFromPreset(preset, htmlContent);
  const sectionBlocks = collectBalancedBlocksByClass(htmlContent, "wx-section-card", ["div", "section"]);
  let nextHtml = htmlContent;

  sectionBlocks.forEach((sectionBlock) => {
    const headingBlock = collectBalancedBlocksByClass(sectionBlock, "wx-section-heading", ["div"])[0];
    if (!headingBlock) return;

    const captionText = stripTags(headingBlock.match(/<[^>]*class=(['"])[^'"]*wx-card-caption[^'"]*\1[^>]*>([\s\S]*?)<\/[^>]+>/i)?.[2] || "");
    const titleText = stripTags(headingBlock.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i)?.[1] || "");
    const bodyBlock = collectBalancedBlocksByClass(sectionBlock, "wx-section-body", ["div"])[0] || sectionBlock;
    const bodyText = stripTags(bodyBlock);
    const markKind = svgGrammar.detectSectionMarkKind({
      caption: captionText,
      title: titleText,
      body: bodyText,
      contentTemplate,
    });
    const markMarkup = `<span class="wx-section-mark" data-mark-kind="${escapeHtml(markKind)}" data-svg-role="section-mark" data-mark-prominence="${composition.mark_prominence}" aria-hidden="true">${svgGrammar.createMarkSvg(markKind, family)}</span>`;

    let nextHeading = headingBlock;
    if (/\bwx-section-mark\b/.test(headingBlock)) {
      nextHeading = headingBlock.replace(
        /<span([^>]*class=(['"])[^'"]*wx-section-mark[^'"]*\2[^>]*)>[\s\S]*?<\/span>/i,
        markMarkup
      );
    } else {
      nextHeading = headingBlock.replace(
        /<div([^>]*class=(['"])[^'"]*wx-title-row[^'"]*\2[^>]*)>/i,
        `${markMarkup}\n      <div$1>`
      );
    }

    const nextSection = sectionBlock.replace(headingBlock, nextHeading);
    nextHtml = replaceFirstExact(nextHtml, sectionBlock, nextSection);
  });

  return nextHtml;
}

function normalizeInlineInfographics(htmlContent, preset) {
  const family = preset?.family || getArticleFamily(htmlContent);
  const contentTemplate = getArticleContentTemplate(htmlContent) || detectContentTemplate(htmlContent, preset);
  const composition = getCompositionProfileFromPreset(preset, htmlContent);
  const contentRule = CONTENT_TEMPLATE_RULES[contentTemplate] || CONTENT_TEMPLATE_RULES["knowledge-article"];
  const pageTone = getArticlePageTone(htmlContent);
  const readingMode = family && READING_PRIORITY_FAMILIES.has(family);

  let nextHtml = htmlContent;
  const badgeBlocks = nextHtml.match(/<div[^>]*class=(['"])[^'"]*wx-badge-art[^'"]*\1[^>]*>[\s\S]*?<\/div>/gi) || [];
  if (pageTone === "event-notice" || contentRule.allowBadgeArt === false || readingMode) {
    badgeBlocks.forEach((block) => {
      nextHtml = replaceFirstExact(nextHtml, block, "");
    });
  }

  const inlineBlocks = nextHtml.match(/<div[^>]*class=(['"])[^'"]*wx-inline-graphic[^'"]*\1[^>]*>[\s\S]*?<\/div>/gi) || [];
  let remaining = typeof contentRule.max_inline_infographics === "number" ? contentRule.max_inline_infographics : 2;
  if (readingMode) remaining = Math.min(remaining, 1);

  inlineBlocks.forEach((block) => {
    const containingSection = collectBalancedBlocksByClass(nextHtml, "wx-section-card", ["div", "section"]).find((sectionBlock) => sectionBlock.includes(block)) || "";
    const headingBlock = collectBalancedBlocksByClass(containingSection, "wx-section-heading", ["div"])[0] || "";
    const bodyBlock = collectBalancedBlocksByClass(containingSection, "wx-section-body", ["div"])[0] || "";
    const semanticText = [
      stripTags(headingBlock.match(/<[^>]*class=(['"])[^'"]*wx-card-caption[^'"]*\1[^>]*>([\s\S]*?)<\/[^>]+>/i)?.[2] || ""),
      stripTags(headingBlock.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i)?.[1] || ""),
      stripTags(bodyBlock),
    ].filter(Boolean).join(" ");
    const explanatoryZone = looksLikeExplanatoryZone(semanticText);
    const interruptsCopy = bodyBlock ? inlineGraphicInterruptsCopy(bodyBlock, block) : false;

    if (remaining <= 0) {
      nextHtml = replaceFirstExact(nextHtml, block, "");
      return;
    }
    if ((readingMode && !explanatoryZone) || interruptsCopy) {
      nextHtml = replaceFirstExact(nextHtml, block, "");
      return;
    }
    const declaredKind = block.match(/data-infographic-kind=(['"])([^'"]+)\1/i)?.[2] || "";
    const blockText = stripTags(block);
    const inferredKind = svgGrammar.chooseInlineInfographicKind({
      body: blockText,
      contentTemplate,
      family,
    });
    const approvedKinds = svgGrammar.getApprovedInfographicKinds(contentTemplate, family);
    const infoKind = approvedKinds.includes(declaredKind) ? declaredKind : inferredKind;
    const replacement = block.replace(
      /<div([^>]*class=(['"])[^'"]*wx-inline-graphic[^'"]*\2[^>]*)>[\s\S]*?<\/div>/i,
      `<div$1 data-infographic-kind="${escapeHtml(infoKind)}" data-svg-role="inline-infographic" data-reading-priority="${composition.reading_priority}" data-scene-density="${composition.scene_density}">${svgGrammar.buildInlineInfographicSvg(infoKind, family)}</div>`
    );
    nextHtml = replaceFirstExact(nextHtml, block, replacement);
    remaining -= 1;
  });

  return nextHtml;
}

function normalizeRuleModeComposition(htmlContent) {
  if (getArticleUiMode(htmlContent) === "free") return htmlContent;

  let nextHtml = htmlContent;
  const bodyBlocks = collectBalancedBlocksByClass(nextHtml, "wx-section-body", ["div"]);
  bodyBlocks.forEach((bodyBlock) => {
    let nextBody = bodyBlock.replace(
      /<span[^>]*class=(['"])[^'"]*wx-section-mark[^'"]*\1[^>]*>[\s\S]*?<\/span>/gi,
      ""
    );
    nextBody = nextBody.replace(
      /<div[^>]*class=(['"])[^'"]*wx-divider-ornament[^'"]*\1[^>]*>[\s\S]*?<\/div>/gi,
      ""
    );
    nextBody = stripStandaloneSvgMarkup(nextBody, [
      /<div[^>]*class=(['"])[^'"]*wx-inline-graphic[^'"]*\1[^>]*>[\s\S]*?<\/div>/gi,
    ]);
    nextHtml = replaceFirstExact(nextHtml, bodyBlock, nextBody);
  });

  return nextHtml;
}

function normalizeFreeModeComposition(htmlContent, preset) {
  if (getArticleUiMode(htmlContent) !== "free") return htmlContent;

  const composition = getCompositionProfileFromPreset(preset, htmlContent);
  let nextHtml = htmlContent.replace(
    /<div([^>]*class=(['"])[^'"]*tp-free-hero-art[^'"]*\2[^>]*)>/gi,
    (_match, attrs) => {
      let nextAttrs = upsertAttribute(attrs, "data-svg-role", "hero-scene");
      nextAttrs = upsertAttribute(nextAttrs, "data-scene-density", composition.scene_density);
      nextAttrs = upsertAttribute(nextAttrs, "data-reading-priority", composition.reading_priority);
      return `<div${nextAttrs}>`;
    }
  );

  nextHtml = nextHtml.replace(
    /<div([^>]*class=(['"])[^'"]*tp-free-divider[^'"]*\2[^>]*)>/gi,
    (_match, attrs) => `<div${upsertAttribute(attrs, "data-svg-role", "divider")}>`
  );

  const promotableBlocks = [
    ...collectBalancedBlocksByClass(nextHtml, "tp-free-panel", ["section", "div", "aside"]),
    ...collectBalancedBlocksByClass(nextHtml, "tp-free-note", ["section", "div", "aside"]),
    ...collectBalancedBlocksByClass(nextHtml, "tp-free-quote", ["blockquote", "div"]),
  ];

  promotableBlocks.forEach((block) => {
    if (!/<svg\b/i.test(block)) return;
    if (/\bdata-svg-role=(['"])(hero-scene|divider)\1/i.test(block)) return;

    if (canPromoteFreeBlockToInfographic(block)) {
      let nextBlock = upsertDataAttrOnTag(block, "data-svg-role", "inline-infographic");
      nextBlock = upsertDataAttrOnTag(nextBlock, "data-reading-priority", composition.reading_priority);
      nextBlock = annotateFirstSvgRole(nextBlock, "inline-infographic", {
        "data-reading-priority": composition.reading_priority,
      });
      nextHtml = replaceFirstExact(nextHtml, block, nextBlock);
      return;
    }

    const strippedBlock = block.replace(/<svg\b[\s\S]*?<\/svg>/gi, "");
    nextHtml = replaceFirstExact(nextHtml, block, strippedBlock);
  });

  nextHtml = stripStandaloneSvgMarkup(nextHtml, [
    /<div[^>]*class=(['"])[^'"]*tp-free-hero-art[^'"]*\1[^>]*>[\s\S]*?<\/div>/gi,
    /<div[^>]*class=(['"])[^'"]*tp-free-divider[^'"]*\1[^>]*>[\s\S]*?<\/div>/gi,
    /<(?:section|div|aside|blockquote)[^>]*data-svg-role=(['"])inline-infographic\1[^>]*>[\s\S]*?<\/(?:section|div|aside|blockquote)>/gi,
  ]);

  return nextHtml;
}

function normalizeSemanticGraphics(htmlContent, preset) {
  let nextHtml = ensureHeroScene(htmlContent, preset);
  nextHtml = normalizeSectionMarks(nextHtml, preset);
  nextHtml = normalizeInlineInfographics(nextHtml, preset);
  nextHtml = pruneLowValueSvgBlocks(nextHtml, preset);
  nextHtml = normalizeRuleModeComposition(nextHtml);
  nextHtml = normalizeFreeModeComposition(nextHtml, preset);
  return nextHtml;
}

function applyPresetMetadata(htmlContent, preset) {
  return htmlContent.replace(/<article\b([^>]*)>/i, (match, attrs) => {
    let nextAttrs = attrs;
    const existingHeadingSystem = getArticleHeadingSystem(htmlContent) || getArticleHeadingSystem(match);
    const detectedTemplate = detectContentTemplate(htmlContent, preset);
    const family = preset.family || getArticleFamily(htmlContent);
    const visualSystem = FAMILY_VISUAL_SYSTEMS[family] || svgGrammar.getFamilyVisualSystem(family);
    const composition = svgGrammar.getCompositionProfile(family);
    const heroScene = svgGrammar.chooseHeroScene({
      contentTemplate: detectedTemplate,
      family,
      archetype: preset.archetype || getArticleArchetype(htmlContent),
    });
    nextAttrs = upsertAttribute(nextAttrs, "data-preset", preset.id);

    if (family) {
      nextAttrs = upsertAttribute(nextAttrs, "data-style-family", family);
    }
    if (preset.archetype) {
      nextAttrs = upsertAttribute(nextAttrs, "data-style-archetype", preset.archetype);
    }
    nextAttrs = upsertAttribute(
      nextAttrs,
      "data-heading-system",
      existingHeadingSystem || getRecommendedHeadingSystem(preset, htmlContent, detectedTemplate)
    );
    nextAttrs = upsertAttribute(
      nextAttrs,
      "data-content-template",
      detectedTemplate
    );
    if (detectedTemplate === "event-notice") {
      nextAttrs = upsertAttribute(nextAttrs, "data-page-tone", "event-notice");
    }
    nextAttrs = upsertAttribute(nextAttrs, "data-svg-grammar", visualSystem.svg_grammar);
    nextAttrs = upsertAttribute(nextAttrs, "data-hero-scene", heroScene);
    nextAttrs = upsertAttribute(nextAttrs, "data-reading-priority", composition.reading_priority);
    nextAttrs = upsertAttribute(nextAttrs, "data-scene-density", composition.scene_density);
    nextAttrs = upsertAttribute(nextAttrs, "data-mark-prominence", composition.mark_prominence);
    nextAttrs = upsertAttribute(nextAttrs, "data-hero-anchor", composition.hero_anchor);
    nextAttrs = upsertAttribute(nextAttrs, "data-mark-placement", composition.mark_placement);
    nextAttrs = upsertAttribute(nextAttrs, "data-graphic-quietness", composition.graphic_quietness);
    nextAttrs = upsertAttribute(nextAttrs, "data-title-safe", composition.title_safe);
    nextAttrs = upsertAttribute(nextAttrs, "data-frame-budget", composition.frame_budget);
    nextAttrs = upsertAttribute(nextAttrs, "data-svg-noise-budget", composition.svg_noise_budget);

    if (getArticleUiMode(match) !== "free") {
      nextAttrs = upsertClassTokens(
        nextAttrs,
        ["article-theme", `style-skin-${preset.skin}`],
        [/^style-skin-[a-z-]+$/]
      );
    }

    return `<article${nextAttrs}>`;
  });
}

function collectFreeHelperClasses(htmlContent) {
  const helperClasses = [
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
  ];

  return helperClasses.filter((className) => new RegExp(`\\b${className}\\b`).test(htmlContent));
}

function listHardcodedColorTokens(htmlContent) {
  return [...htmlContent.matchAll(/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g)]
    .map((match) => match[0].toLowerCase())
    .filter((token) => !["#fff", "#ffffff", "#000", "#000000"].includes(token))
    .filter((token, index, array) => array.indexOf(token) === index);
}

function pickDividerStrategy(htmlContent, preset) {
  const skin = getArticleSkin(htmlContent);
  const family = preset?.family || getArticleFamily(htmlContent);
  const presetId = preset?.id || "";
  const isEditorialNewsPreset = /(journal|brief|report|bulletin|digest|briefing)/i.test(presetId);
  const grammarVariant = svgGrammar.getDividerVariantForFamily(family);

  if (["swiss-journal", "field-atlas", "brief-bulletin", "skyline-pane"].includes(family)) {
    return { mode: "remove", reason: family };
  }

  if (family && grammarVariant) {
    return { mode: "replace", variant: grammarVariant };
  }

  if (["editorial", "magazine"].includes(skin) || isEditorialNewsPreset) {
    return { mode: "remove", reason: "editorial-news" };
  }

  if (["tech", "neon", "mono-dark"].includes(skin) || /(ops|signal|terminal|neon|cobalt)/i.test(presetId)) {
    return { mode: "replace", variant: "chevron-band" };
  }

  if (["brutal", "luxe-dark"].includes(skin)) {
    return { mode: "replace", variant: "fold-divider" };
  }

  if (["glass", "luxe", "mono"].includes(skin)) {
    return { mode: "replace", variant: "editorial-notch" };
  }

  return { mode: "replace", variant: "soft-stars" };
}

function detectDividerVariant(svgContent) {
  if (/M18 10h78M124 10h78/.test(svgContent) && /M110 5\.5 114\.5 10 110 14\.5/.test(svgContent)) {
    return "editorial-notch";
  }
  if (/M4 14h70M146 14h70/.test(svgContent) && /circle cx="110" cy="14" r="10"/.test(svgContent)) {
    return "line-orbit";
  }
  if (/m102 7 2\.5 5\.5/i.test(svgContent) || /L110 15l-5\.5 2\.5/i.test(svgContent)) {
    return "soft-stars";
  }
  if (/M8 14h66l12-8 12 8 12-8 12 8h90/.test(svgContent)) {
    return "chevron-band";
  }
  if (/M8 14h78l16-8 16 8 16-8 16 8h62/.test(svgContent)) {
    return "fold-divider";
  }
  return null;
}

function fingerprintSvgMarkup(svgContent) {
  return String(svgContent || "")
    .replace(/\s+/g, " ")
    .replace(/\s(?:fill|stroke|opacity|stop-color|stroke-width|stroke-linecap|stroke-linejoin|filter|transform|style|class|xmlns|aria-hidden|data-[^=]+)=(['"])[^'"]*\1/gi, "")
    .replace(/\d+(?:\.\d+)?/g, "#")
    .trim();
}

function setDividerVariantAttr(attrs, variant) {
  const sanitizedAttrs = attrs.replace(/\sdata-divider-variant=(['"])[^'"]*\1/gi, "");
  return variant ? `${sanitizedAttrs} data-divider-variant="${variant}"` : sanitizedAttrs;
}

function normalizeDividerOrnaments(htmlContent, preset) {
  const strategy = pickDividerStrategy(htmlContent, preset);
  let normalizedCount = 0;
  let replacedCount = 0;
  let removedCount = 0;

  const html = htmlContent.replace(
    /<div([^>]*class=(['"])[^'"]*wx-divider-ornament[^'"]*\2[^>]*)>([\s\S]*?)<\/div>/gi,
    (match, attrs, _quote, innerHtml) => {
      normalizedCount++;
      if (strategy.mode === "remove") {
        removedCount++;
        return "";
      }

      const preferredVariant = strategy.variant;
      const hasSvg = /<svg\b/i.test(innerHtml);
      const currentVariant = hasSvg ? detectDividerVariant(innerHtml) : null;
      const shouldReplace = !hasSvg
        || currentVariant === "line-orbit"
        || (currentVariant !== null && currentVariant !== preferredVariant);
      const nextVariant = shouldReplace ? preferredVariant : currentVariant;
      const nextInner = shouldReplace ? DIVIDER_VARIANT_SVGS[preferredVariant] : innerHtml.trim();

      if (shouldReplace) {
        replacedCount++;
      }

      let nextAttrs = setDividerVariantAttr(attrs, nextVariant);
      nextAttrs = upsertAttribute(nextAttrs, "data-svg-role", "divider");
      return `<div${nextAttrs}>\n      ${nextInner}\n    </div>`;
    }
  );

  return {
    html,
    normalizedCount,
    replacedCount,
    removedCount,
    strategy,
  };
}

function countTemplateColumns(styleValue) {
  const match = styleValue.match(/grid-template-columns\s*:\s*([^;]+)/i);
  if (!match) return null;
  const template = match[1].trim();

  const repeatMatch = template.match(/repeat\(\s*(\d+)\s*,/i);
  if (repeatMatch) return parseInt(repeatMatch[1], 10);

  const columns = template.match(/minmax\([^)]+\)|(?:\d*\.?\d+fr)|auto/gi);
  return columns ? columns.length : null;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countClassToken(htmlContent, className) {
  return htmlHelpers.countClassToken(htmlContent, className);
}

function extractBalancedBlockFromOpenTag(htmlContent, startIndex, tagName) {
  return htmlHelpers.extractBalancedBlockFromOpenTag(htmlContent, startIndex, tagName);
}

function collectBalancedBlocksByClass(htmlContent, className, tagNames = ["div", "section"]) {
  return htmlHelpers.collectBalancedBlocksByClass(htmlContent, className, tagNames);
}

function validateGridLayouts(htmlContent) {
  const regex = /<div[^>]*class=(['"])([^'"]*wx-(metric|compare)-grid[^'"]*)\1[^>]*style=(['"])([^'"]*)\4/gi;
  let match;

  while ((match = regex.exec(htmlContent))) {
    const kind = match[3];
    const columns = countTemplateColumns(match[5]);
    if (columns !== null && columns > 2) {
      throw new Error(
        `Mobile layout guard: wx-${kind}-grid uses ${columns} columns. ` +
        "Keep metric/compare grids at 1-2 columns for mobile readability."
      );
    }
  }
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

function validateDecorativeGraphics(htmlContent) {
  const lightSkins = new Set(["editorial", "glass", "magazine", "soft", "tech", "mono", "luxe", "brutal"]);
  const skin = getArticleSkin(htmlContent);
  const pageTone = getArticlePageTone(htmlContent);
  const family = getArticleFamily(htmlContent);
  const contentTemplate = getArticleContentTemplate(htmlContent);
  const contentRule = CONTENT_TEMPLATE_RULES[contentTemplate] || CONTENT_TEMPLATE_RULES["knowledge-article"];
  const inlineGraphicCount = countClassToken(htmlContent, "wx-inline-graphic");
  const badgeArtCount = countClassToken(htmlContent, "wx-badge-art");

  if ((pageTone === "event-notice" || contentRule.allowBadgeArt === false) && badgeArtCount > 0) {
    throw new Error(
      `Visual guard: ${contentTemplate || "this template"} should not use wx-badge-art. ` +
      "Let hero scene, section marks, and typography carry the identity instead."
    );
  }

  if (family && READING_PRIORITY_FAMILIES.has(family)) {
    if (badgeArtCount > 0) {
      throw new Error(
        `Visual guard: ${family} is a reading-first family. Remove wx-badge-art and let titles, captions, and spacing carry the rhythm.`
      );
    }

    if (inlineGraphicCount > 1) {
      throw new Error(
        `Visual guard: ${family} should not stack multiple wx-inline-graphic blocks. Use at most one information graphic in reading-first layouts.`
      );
    }
  }

  if (typeof contentRule.max_inline_infographics === "number" && inlineGraphicCount > contentRule.max_inline_infographics) {
    throw new Error(
      `Visual guard: ${contentTemplate} allows at most ${contentRule.max_inline_infographics} wx-inline-graphic block(s). ` +
      "Keep information graphics to the smallest count that actually improves comprehension."
    );
  }

  if (!skin || !lightSkins.has(skin)) return;

  const regex = /<div[^>]*class=(['"])([^'"]*wx-(inline-graphic|badge-art)[^'"]*)\1[^>]*>([\s\S]*?)<\/div>/gi;
  let match;

  while ((match = regex.exec(htmlContent))) {
    const componentName = match[3];
    const blockHtml = match[4];
    const svgMatch = blockHtml.match(/<svg\b[\s\S]*?<\/svg>/i);
    if (!svgMatch) continue;

    if (svgLooksLowContrast(svgMatch[0])) {
      throw new Error(
        `Visual guard: wx-${componentName} uses a low-contrast SVG on a light theme. ` +
        "Use currentColor / preset variables / visible accent strokes, or remove the decorative block."
      );
    }
  }
}

function validateSectionHeadingSystems(htmlContent) {
  const sectionTopBlocks = collectBalancedBlocksByClass(htmlContent, "wx-section-top", ["div"]);
  if (sectionTopBlocks.length === 0) return;

  const headingSystem = getArticleHeadingSystem(htmlContent);
  const pageTone = getArticlePageTone(htmlContent);
  const family = getArticleFamily(htmlContent);
  const indexes = [];
  const placeholderHits = [];
  const sectionNumbersWithLegacyDecor = [];
  const sectionNumbersWithExtraMarks = [];

  if (pageTone === "event-notice" && headingSystem !== "index-led") {
    throw new Error(
      "Heading guard: event-notice pages must use data-heading-system=\"index-led\" so the title remains the primary reading target."
    );
  }

  if (headingSystem === "dual" && family && !PRODUCT_FAMILIES.has(family)) {
    throw new Error(
      `Heading guard: data-heading-system="dual" is reserved for product/panel families. ` +
      `Use index-led / icon-led / plaque for ${family}.`
    );
  }

  sectionTopBlocks.forEach((sectionTopBlock, idx) => {
    const sectionNumber = idx + 1;
    const iconBlocks = collectBalancedBlocksByClass(sectionTopBlock, "wx-section-icon", ["div"]);
    const headingBlocks = collectBalancedBlocksByClass(sectionTopBlock, "wx-section-heading", ["div"]);

    if (headingBlocks.length === 0) {
      throw new Error(`Heading guard: section ${sectionNumber} has wx-section-top but no wx-section-heading.`);
    }

    const headingBlock = headingBlocks[0];
    const iconCount = iconBlocks.length;
    const indexCount = countClassToken(headingBlock, "wx-section-index");
    const markCount = countClassToken(headingBlock, "wx-section-mark");
    const legacyDecorCount = countClassToken(headingBlock, "wx-section-emblem")
      + countClassToken(headingBlock, "wx-title-flank")
      + countClassToken(headingBlock, "wx-heading-ornament");

    if (headingSystem === "dual" && (iconCount === 0 || indexCount === 0)) {
      throw new Error(
        "Heading guard: data-heading-system=\"dual\" requires each headed section to provide both wx-section-icon and wx-section-index."
      );
    }

    if (headingSystem === "icon-led" && iconCount === 0) {
      throw new Error(
        "Heading guard: data-heading-system=\"icon-led\" requires each headed section to provide wx-section-icon."
      );
    }

    if (headingSystem === "index-led" && indexCount === 0) {
      throw new Error(
        "Heading guard: data-heading-system=\"index-led\" requires each headed section to provide wx-section-index."
      );
    }

    if (pageTone === "event-notice" && iconCount > 0) {
      throw new Error(
        `Heading guard: event-notice section ${sectionNumber} still contains wx-section-icon. ` +
        "Use wx-section-mark as the single semantic badge and keep the title column unobstructed."
      );
    }

    if (pageTone === "event-notice" && markCount !== 1) {
      throw new Error(
        `Heading guard: event-notice section ${sectionNumber} must provide exactly one wx-section-mark.`
      );
    }

    if (legacyDecorCount > 0) {
      sectionNumbersWithLegacyDecor.push(sectionNumber);
    }

    if (markCount + legacyDecorCount > 1) {
      sectionNumbersWithExtraMarks.push(sectionNumber);
    }

    iconBlocks.forEach((block) => {
      if (/M5\s*12h14[^"]*M12\s*5v14|M6\s*12h12[^"]*M12\s*6v12/i.test(block.replace(/\s+/g, " "))) {
        placeholderHits.push(sectionNumber);
      }
    });

    const indexMatch = headingBlock.match(/<[^>]*class=(['"])[^'"]*wx-section-index[^'"]*\1[^>]*>([\s\S]*?)<\/[^>]+>/i);
    if (indexMatch) {
      const text = indexMatch[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const numMatch = text.match(/(\d{1,3})/);
      if (numMatch) {
        indexes.push({ section: sectionNumber, value: parseInt(numMatch[1], 10) });
      }
    }
  });

  if (sectionNumbersWithLegacyDecor.length > 0) {
    throw new Error(
      `Heading guard: deprecated heading decorators detected in section ${sectionNumbersWithLegacyDecor.join(", ")}. ` +
      "Use a single wx-section-mark instead of wx-title-flank / wx-heading-ornament / wx-section-emblem."
    );
  }

  if (sectionNumbersWithExtraMarks.length > 0) {
    throw new Error(
      `Heading guard: section ${sectionNumbersWithExtraMarks.join(", ")} uses multiple heading graphics. ` +
      "Keep one semantic badge per section heading."
    );
  }

  if (placeholderHits.length > 0) {
    throw new Error(
      `Heading guard: placeholder plus SVG detected in wx-section-icon (section ${placeholderHits.join(", ")}). Use a semantic SVG from the library or a custom theme-specific icon.`
    );
  }

  if (indexes.length > 0) {
    const expectedStart = 1;
    if (indexes[0].value !== expectedStart) {
      throw new Error(
        `Heading guard: section numbering should start at 01. Found ${indexes[0].value} in the first indexed section.`
      );
    }

    for (let i = 1; i < indexes.length; i++) {
      if (indexes[i].value !== indexes[i - 1].value + 1) {
        throw new Error(
          `Heading guard: section numbering is discontinuous between ${indexes[i - 1].value} and ${indexes[i].value}. Keep wx-section-index sequential.`
        );
      }
    }
  }
}

function countSvgNodes(svgContent) {
  return (String(svgContent || "").match(/<(?:path|circle|rect|line|polyline|polygon|ellipse)\b/gi) || []).length;
}

function pruneLowValueSvgBlocks(htmlContent, preset) {
  const family = preset?.family || getArticleFamily(htmlContent);
  const composition = svgGrammar.getCompositionProfile(family);
  const readingFirst = composition.reading_priority === "reading-first";
  const quietGraphics = composition.graphic_quietness === "high";
  const strictTitleSafe = composition.title_safe === "strict";
  let nextHtml = htmlContent;

  nextHtml = nextHtml.replace(
    /<div([^>]*class=(['"])[^'"]*wx-hero-mesh[^'"]*\2[^>]*)>([\s\S]*?)<\/div>/i,
    (match, attrs, _quote, innerHtml) => {
      const svgMatch = innerHtml.match(/<svg\b[\s\S]*?<\/svg>/i);
      if (!svgMatch) return match;
      const svgMarkup = svgMatch[0];
      const nodeCount = countSvgNodes(svgMarkup);
      const hasSceneTemplate = /data-scene-template=(['"])[^'"]+\1/i.test(svgMarkup);
      const lowContrast = svgLooksLowContrast(svgMarkup);
      const shouldDrop = !hasSceneTemplate
        || nodeCount < (readingFirst ? 3 : 2)
        || (quietGraphics && nodeCount <= 4)
        || (strictTitleSafe && nodeCount <= 5)
        || (lowContrast && nodeCount <= Math.max(5, svgGrammar.getHeroNodeBudget(composition) - 6));
      if (!shouldDrop) return match;
      return `<div${attrs}>${innerHtml.replace(/<svg\b[\s\S]*?<\/svg>/i, "")}</div>`;
    }
  );

  nextHtml = nextHtml.replace(
    /<div[^>]*class=(['"])[^'"]*wx-inline-graphic[^'"]*\1[^>]*>[\s\S]*?<\/div>/gi,
    (block) => {
      const svgMatch = block.match(/<svg\b[\s\S]*?<\/svg>/i);
      if (!svgMatch) return "";
      const svgMarkup = svgMatch[0];
      const nodeCount = countSvgNodes(svgMarkup);
      const hasTemplate = /data-infographic-template=(['"])[^'"]+\1/i.test(svgMarkup);
      const lowContrast = svgLooksLowContrast(svgMarkup);
      const shouldDrop = !hasTemplate
        || nodeCount < 3
        || (quietGraphics && nodeCount <= 5)
        || (strictTitleSafe && nodeCount <= 6)
        || lowContrast;
      return shouldDrop ? "" : block;
    }
  );

  nextHtml = nextHtml.replace(
    /<div[^>]*class=(['"])[^'"]*wx-badge-art[^'"]*\1[^>]*>[\s\S]*?<\/div>/gi,
    (block) => {
      const svgMatch = block.match(/<svg\b[\s\S]*?<\/svg>/i);
      if (!svgMatch) return "";
      const svgMarkup = svgMatch[0];
      const nodeCount = countSvgNodes(svgMarkup);
      return nodeCount <= 3 || svgLooksLowContrast(svgMarkup) ? "" : block;
    }
  );

  return nextHtml;
}

function hasTextualStructure(fragment) {
  if (!fragment) return false;
  if (!/<(?:p|ul|ol|blockquote|table|figure)\b/i.test(fragment)) return false;
  return stripTags(fragment).length > 0;
}

function inlineGraphicInterruptsCopy(bodyBlock, inlineBlock) {
  if (!bodyBlock || !inlineBlock) return false;
  const index = bodyBlock.indexOf(inlineBlock);
  if (index === -1) return false;
  const before = bodyBlock.slice(0, index);
  const after = bodyBlock.slice(index + inlineBlock.length);
  return hasTextualStructure(before) && hasTextualStructure(after);
}

function collectFreeHeroArtBlocks(htmlContent) {
  return collectBalancedBlocksByClass(htmlContent, "tp-free-hero-art", ["div", "figure"]);
}

function collectFreeDividerBlocks(htmlContent) {
  return collectBalancedBlocksByClass(htmlContent, "tp-free-divider", ["div", "hr"]);
}

function collectFreeInfographicBlocks(htmlContent) {
  return [
    ...collectBalancedBlocksByClass(htmlContent, "tp-free-panel", ["section", "div", "aside"]),
    ...collectBalancedBlocksByClass(htmlContent, "tp-free-note", ["section", "div", "aside"]),
    ...collectBalancedBlocksByClass(htmlContent, "tp-free-quote", ["blockquote", "div"]),
  ].filter((block) => /data-svg-role=(['"])inline-infographic\1/i.test(block));
}

function validateSvgGrammarSemantics(htmlContent) {
  if (getArticleUiMode(htmlContent) === "free") return;

  const family = getArticleFamily(htmlContent);
  const contentTemplate = getArticleContentTemplate(htmlContent);
  const contentRule = CONTENT_TEMPLATE_RULES[contentTemplate] || CONTENT_TEMPLATE_RULES["knowledge-article"];
  const visualSystem = svgGrammar.getFamilyVisualSystem(family);
  const composition = svgGrammar.getCompositionProfile(family);
  const declaredGrammar = getArticleSvgGrammar(htmlContent);
  const declaredHeroScene = getArticleHeroScene(htmlContent);
  const declaredReadingPriority = getArticleReadingPriority(htmlContent);
  const declaredSceneDensity = getArticleSceneDensity(htmlContent);
  const declaredMarkProminence = getArticleMarkProminence(htmlContent);
  const declaredTitleSafe = getArticleTitleSafe(htmlContent);
  const declaredFrameBudget = getArticleFrameBudget(htmlContent);
  const declaredSvgNoiseBudget = getArticleSvgNoiseBudget(htmlContent);
  const expectedHeroScene = svgGrammar.chooseHeroScene({
    contentTemplate,
    family,
    archetype: getArticleArchetype(htmlContent),
  });

  if (!declaredGrammar) {
    throw new Error("SVG grammar guard: article is missing data-svg-grammar.");
  }
  if (declaredGrammar !== visualSystem.svg_grammar) {
    throw new Error(
      `SVG grammar guard: family ${family || "default"} should use ${visualSystem.svg_grammar}, found ${declaredGrammar}.`
    );
  }
  if (declaredReadingPriority !== composition.reading_priority) {
    throw new Error(
      `SVG composition guard: family ${family || "default"} should use data-reading-priority="${composition.reading_priority}", found ${declaredReadingPriority || "missing"}.`
    );
  }
  if (declaredSceneDensity !== composition.scene_density) {
    throw new Error(
      `SVG composition guard: family ${family || "default"} should use data-scene-density="${composition.scene_density}", found ${declaredSceneDensity || "missing"}.`
    );
  }
  if (declaredMarkProminence !== composition.mark_prominence) {
    throw new Error(
      `SVG composition guard: family ${family || "default"} should use data-mark-prominence="${composition.mark_prominence}", found ${declaredMarkProminence || "missing"}.`
    );
  }
  if (declaredTitleSafe !== composition.title_safe) {
    throw new Error(
      `SVG composition guard: family ${family || "default"} should use data-title-safe="${composition.title_safe}", found ${declaredTitleSafe || "missing"}.`
    );
  }
  if (declaredFrameBudget !== composition.frame_budget) {
    throw new Error(
      `SVG composition guard: family ${family || "default"} should use data-frame-budget="${composition.frame_budget}", found ${declaredFrameBudget || "missing"}.`
    );
  }
  if (declaredSvgNoiseBudget !== composition.svg_noise_budget) {
    throw new Error(
      `SVG composition guard: family ${family || "default"} should use data-svg-noise-budget="${composition.svg_noise_budget}", found ${declaredSvgNoiseBudget || "missing"}.`
    );
  }
  if (!declaredHeroScene) {
    throw new Error("SVG grammar guard: article is missing data-hero-scene.");
  }
  if (declaredHeroScene !== expectedHeroScene) {
    throw new Error(
      `SVG grammar guard: content-template ${contentTemplate} with family ${family || "default"} should use hero scene ${expectedHeroScene}, found ${declaredHeroScene}.`
    );
  }

  const heroMeshBlock = collectBalancedBlocksByClass(htmlContent, "wx-hero-mesh", ["div"])[0] || "";
  if (heroMeshBlock && !new RegExp(`data-hero-scene=(['"])${escapeRegExp(declaredHeroScene)}\\1`, "i").test(heroMeshBlock)) {
    throw new Error("SVG grammar guard: wx-hero-mesh must carry the same data-hero-scene as the article root.");
  }
  if (heroMeshBlock && !/data-svg-role=(['"])hero-scene\1/i.test(heroMeshBlock)) {
    throw new Error("SVG composition guard: wx-hero-mesh must carry data-svg-role=\"hero-scene\".");
  }
  if (heroMeshBlock && !new RegExp(`data-scene-density=(['"])${escapeRegExp(composition.scene_density)}\\1`, "i").test(heroMeshBlock)) {
    throw new Error("SVG composition guard: wx-hero-mesh must carry the article scene density metadata.");
  }
  if (heroMeshBlock && !new RegExp(`data-reading-priority=(['"])${escapeRegExp(composition.reading_priority)}\\1`, "i").test(heroMeshBlock)) {
    throw new Error("SVG composition guard: wx-hero-mesh must carry the article reading-priority metadata.");
  }
  const heroSvg = heroMeshBlock.match(/<svg\b[\s\S]*?<\/svg>/i)?.[0] || "";
  const heroNodeCount = countSvgNodes(heroSvg);
  if (heroSvg && !new RegExp(`data-scene-template=(['"])${escapeRegExp(declaredHeroScene)}\\1`, "i").test(heroSvg)) {
    throw new Error("SVG grammar guard: hero scene SVG must come from the registered scene library.");
  }
  if (heroSvg && !/data-svg-role=(['"])hero-scene\1/i.test(heroSvg)) {
    throw new Error("SVG composition guard: hero scene SVG must declare data-svg-role=\"hero-scene\".");
  }
  if (heroNodeCount > svgGrammar.getHeroNodeBudget(composition)) {
    throw new Error(`SVG composition guard: hero scene is too noisy (${heroNodeCount} nodes). Keep hero scenes structural and legible.`);
  }
  if (heroSvg && heroNodeCount < 2) {
    throw new Error("SVG grammar guard: hero scene is too generic. Use a registered scene instead of a bare gradient mesh.");
  }
  const heroRoleHitsOutsideHero = (htmlContent.match(/data-svg-role=(['"])hero-scene\1/gi) || []).length
    - (heroMeshBlock ? 1 : 0)
    - (heroSvg ? 1 : 0);
  if (heroRoleHitsOutsideHero > 0) {
    throw new Error("SVG composition guard: hero-scene role is only allowed in wx-hero-mesh and its registered SVG.");
  }

  const repeatedKinds = new Map();
  const fingerprintRegistry = new Map();
  const sectionBlocks = collectBalancedBlocksByClass(htmlContent, "wx-section-card", ["div", "section"]);
  sectionBlocks.forEach((sectionBlock, index) => {
    const headingBlock = collectBalancedBlocksByClass(sectionBlock, "wx-section-heading", ["div"])[0];
    if (!headingBlock) return;

    const sectionNumber = index + 1;
    const captionText = stripTags(headingBlock.match(/<[^>]*class=(['"])[^'"]*wx-card-caption[^'"]*\1[^>]*>([\s\S]*?)<\/[^>]+>/i)?.[2] || "");
    const titleText = stripTags(headingBlock.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i)?.[1] || "");
    const bodyBlock = collectBalancedBlocksByClass(sectionBlock, "wx-section-body", ["div"])[0] || sectionBlock;
    const bodyText = stripTags(bodyBlock);
    const expectedKind = svgGrammar.detectSectionMarkKind({
      caption: captionText,
      title: titleText,
      body: bodyText,
      contentTemplate,
    });
    const markBlock = headingBlock.match(/<span[^>]*class=(['"])[^'"]*wx-section-mark[^'"]*\1[^>]*>[\s\S]*?<\/span>/i)?.[0] || "";
    const markKind = markBlock.match(/data-mark-kind=(['"])([^'"]+)\1/i)?.[2] || "";
    const svgMatch = markBlock.match(/<svg\b[\s\S]*?<\/svg>/i);

    if (!markKind) {
      throw new Error(`SVG grammar guard: section ${sectionNumber} is missing data-mark-kind on wx-section-mark.`);
    }
    if (!/data-svg-role=(['"])section-mark\1/i.test(markBlock)) {
      throw new Error(`SVG composition guard: section ${sectionNumber} mark must carry data-svg-role="section-mark".`);
    }
    if (!new RegExp(`data-mark-prominence=(['"])${escapeRegExp(composition.mark_prominence)}\\1`, "i").test(markBlock)) {
      throw new Error(`SVG composition guard: section ${sectionNumber} mark must carry data-mark-prominence="${composition.mark_prominence}".`);
    }
    if (markKind !== expectedKind) {
      throw new Error(
        `SVG grammar guard: section ${sectionNumber} should use mark kind ${expectedKind} for "${captionText || titleText}", found ${markKind}.`
      );
    }
    if (!svgMatch) {
      throw new Error(`SVG grammar guard: section ${sectionNumber} is missing an inline SVG inside wx-section-mark.`);
    }

    const nodeCount = (svgMatch[0].match(/<(?:path|circle|rect|line|polyline|polygon|ellipse)\b/gi) || []).length;
    if (nodeCount > 8) {
      throw new Error(`SVG grammar guard: section ${sectionNumber} mark is too complex (${nodeCount} nodes). Keep section marks small and semantic.`);
    }
    const fingerprint = fingerprintSvgMarkup(svgMatch[0]);
    const previousFingerprint = fingerprintRegistry.get(fingerprint);
    if (previousFingerprint && previousFingerprint.kind !== markKind) {
      throw new Error(
        `SVG grammar guard: section ${sectionNumber} reuses the ${previousFingerprint.kind} mark geometry for ${markKind}. ` +
        "Do not fake semantic variety by only swapping colors."
      );
    }
    fingerprintRegistry.set(fingerprint, { kind: markKind, section: sectionNumber });
    repeatedKinds.set(markKind, (repeatedKinds.get(markKind) || 0) + 1);
  });

  const excessiveRepeats = [...repeatedKinds.entries()]
    .filter((entry) => entry[1] >= 4 && entry[0] !== (svgGrammar.DEFAULT_MARK_KIND_BY_TEMPLATE[contentTemplate] || ""))
    .map((entry) => entry[0]);
  if (excessiveRepeats.length > 0) {
    throw new Error(
      `SVG grammar guard: repeated mark kinds detected (${excessiveRepeats.join(", ")}). Distinct section semantics should not collapse into the same badge.`
    );
  }

  const inlineBlocks = htmlContent.match(/<div[^>]*class=(['"])[^'"]*wx-inline-graphic[^'"]*\1[^>]*>[\s\S]*?<\/div>/gi) || [];
  const approvedInlineKinds = svgGrammar.getApprovedInfographicKinds(contentTemplate, family);
  const bodyBlocks = collectBalancedBlocksByClass(htmlContent, "wx-section-body", ["div"]);
  bodyBlocks.forEach((bodyBlock, idx) => {
    if (/\bwx-section-mark\b/.test(bodyBlock)) {
      throw new Error(`SVG composition guard: section ${idx + 1} body still contains wx-section-mark. Keep section marks in the heading meta lane only.`);
    }
    const strippedBody = stripStandaloneSvgMarkup(bodyBlock, [
      /<div[^>]*class=(['"])[^'"]*wx-inline-graphic[^'"]*\1[^>]*>[\s\S]*?<\/div>/gi,
    ]);
    if (/<svg\b/i.test(strippedBody)) {
      throw new Error(`SVG composition guard: section ${idx + 1} body contains standalone SVG. Use wx-inline-graphic as a dedicated structure block or remove the decoration.`);
    }
  });
  inlineBlocks.forEach((block, idx) => {
    const kind = block.match(/data-infographic-kind=(['"])([^'"]+)\1/i)?.[2] || "";
    const svgMatch = block.match(/<svg\b[\s\S]*?<\/svg>/i);
    const containingBody = bodyBlocks.find((bodyBlock) => bodyBlock.includes(block)) || "";
    if (!kind) {
      throw new Error(`SVG grammar guard: wx-inline-graphic ${idx + 1} is missing data-infographic-kind.`);
    }
    if (!/data-svg-role=(['"])inline-infographic\1/i.test(block)) {
      throw new Error(`SVG composition guard: wx-inline-graphic ${idx + 1} must carry data-svg-role="inline-infographic".`);
    }
    if (!svgMatch) {
      throw new Error(`SVG grammar guard: wx-inline-graphic ${idx + 1} is missing an SVG payload.`);
    }
    if (approvedInlineKinds.length > 0 && !approvedInlineKinds.includes(kind)) {
      throw new Error(
        `SVG grammar guard: wx-inline-graphic ${idx + 1} uses ${kind}, which is not approved for ${contentTemplate}/${family || "default"}.`
      );
    }
    if (!new RegExp(`data-infographic-template=(['"])${escapeRegExp(kind)}\\1`, "i").test(svgMatch[0])) {
      throw new Error(`SVG grammar guard: wx-inline-graphic ${idx + 1} must come from the approved infographic registry.`);
    }
    const nodeCount = countSvgNodes(svgMatch[0]);
    if (nodeCount > svgGrammar.getInlineInfographicNodeBudget(composition)) {
      throw new Error(`SVG grammar guard: wx-inline-graphic ${idx + 1} is too complex (${nodeCount} nodes). Use a clearer structural infographic.`);
    }
    if (containingBody && inlineGraphicInterruptsCopy(containingBody, block)) {
      throw new Error(`SVG composition guard: wx-inline-graphic ${idx + 1} interrupts continuous body copy. Move it before or after the section text cluster.`);
    }
  });

  if (typeof contentRule.max_inline_infographics === "number" && inlineBlocks.length > contentRule.max_inline_infographics) {
    throw new Error(
      `SVG grammar guard: ${contentTemplate} allows at most ${contentRule.max_inline_infographics} inline infographic block(s).`
    );
  }
}

function validateDividerOrnaments(htmlContent) {
  const dividerBlocks = htmlContent.match(/<div[^>]*class=(['"])[^'"]*wx-divider-ornament[^'"]*\1[^>]*>[\s\S]*?<\/div>/gi) || [];
  const skin = getArticleSkin(htmlContent);
  const family = getArticleFamily(htmlContent);

  if (dividerBlocks.length > 2) {
    throw new Error(
      `Divider guard: found ${dividerBlocks.length} wx-divider-ornament blocks. ` +
      "Use 0-2 chapter dividers on mobile pages; section-card spacing already provides separation."
    );
  }

  const orbitCount = dividerBlocks.filter((block) => detectDividerVariant(block) === "line-orbit").length;
  if (orbitCount > 0) {
    throw new Error(
      "Divider guard: the generic line-orbit divider is deprecated. " +
      "Use editorial-notch / soft-stars / chevron-band / fold-divider, or omit the divider entirely."
    );
  }

  if ((skin === "editorial" || ["swiss-journal", "field-atlas", "brief-bulletin", "skyline-pane"].includes(family)) && dividerBlocks.length > 0) {
    throw new Error(
      "Divider guard: editorial/news layouts should not rely on decorative dividers. " +
      "Use card spacing, headings, and section rhythm instead."
    );
  }

  dividerBlocks.forEach((block, idx) => {
    if (!/data-svg-role=(['"])divider\1/i.test(block)) {
      throw new Error(`Divider guard: divider ${idx + 1} must carry data-svg-role="divider".`);
    }
  });

  const bodyBlocks = collectBalancedBlocksByClass(htmlContent, "wx-section-body", ["div"]);
  bodyBlocks.forEach((bodyBlock, idx) => {
    if (/\bwx-divider-ornament\b/.test(bodyBlock)) {
      throw new Error(`Divider guard: divider ${idx + 1} is placed inside wx-section-body. Keep dividers between cards, not inside body copy.`);
    }
  });
}

function validateFreeModeDesign(htmlContent) {
  if (getArticleUiMode(htmlContent) !== "free") return;

  const freeHelpers = collectFreeHelperClasses(htmlContent);
  const composition = svgGrammar.getCompositionProfile(getArticleFamily(htmlContent));
  if (!freeHelpers.includes("tp-free-shell") || freeHelpers.length < 3) {
    throw new Error(
      "Free-mode guard: start from tp-free primitives. Use tp-free-shell plus at least two other tp-free-* helpers before adding custom classes."
    );
  }

  const hardcodedColors = listHardcodedColorTokens(htmlContent);
  if (hardcodedColors.length > 0) {
    throw new Error(
      `Free-mode guard: found hardcoded theme colors (${hardcodedColors.join(", ")}). ` +
      "Use preset CSS variables instead of custom hex colors."
    );
  }

  const freeHeroArts = collectFreeHeroArtBlocks(htmlContent);
  const freeDividers = collectFreeDividerBlocks(htmlContent);
  const freeInfographics = collectFreeInfographicBlocks(htmlContent);
  const totalSvgCount = (htmlContent.match(/<svg\b/gi) || []).length;

  if (freeHeroArts.length > 1) {
    throw new Error("Free-mode guard: only one tp-free-hero-art block is allowed. Keep one visual lead, not multiple competing scenes.");
  }

  freeHeroArts.forEach((block, idx) => {
    const freeHeroBlock = collectBalancedBlocksByClass(htmlContent, "tp-free-hero", ["section", "div"]).find((heroBlock) => heroBlock.includes(block));
    if (!freeHeroBlock) {
      throw new Error(`Free-mode guard: tp-free-hero-art ${idx + 1} must stay inside tp-free-hero.`);
    }
    if (!/data-svg-role=(['"])hero-scene\1/i.test(block)) {
      throw new Error(`Free-mode guard: tp-free-hero-art ${idx + 1} must carry data-svg-role="hero-scene".`);
    }
    const svgMarkup = block.match(/<svg\b[\s\S]*?<\/svg>/i)?.[0] || "";
    const nodeCount = countSvgNodes(svgMarkup);
    if (nodeCount > svgGrammar.getHeroNodeBudget(composition) + 2) {
      throw new Error(`Free-mode guard: tp-free-hero-art ${idx + 1} is too noisy (${nodeCount} nodes). Keep the free hero graphic structural.`);
    }
  });

  freeDividers.forEach((block, idx) => {
    if (!/data-svg-role=(['"])divider\1/i.test(block)) {
      throw new Error(`Free-mode guard: tp-free-divider ${idx + 1} must carry data-svg-role="divider".`);
    }
  });

  if (freeInfographics.length > 1) {
    throw new Error("Free-mode guard: keep at most one standalone infographic SVG zone. Free mode stays open, but it still needs a single dominant graphic rhythm.");
  }

  freeInfographics.forEach((block, idx) => {
    if (!/\b(?:tp-free-panel|tp-free-note|tp-free-quote)\b/.test(block)) {
      throw new Error(`Free-mode guard: infographic block ${idx + 1} must live in an independent tp-free-panel / tp-free-note / tp-free-quote zone.`);
    }
    if (!canPromoteFreeBlockToInfographic(block)) {
      throw new Error(`Free-mode guard: infographic block ${idx + 1} is too decorative for the reading lane. Keep it explanatory, compact, and structurally independent.`);
    }
  });

  if (totalSvgCount > freeHeroArts.length + freeDividers.length + freeInfographics.length) {
    throw new Error(
      "Free-mode guard: found SVG outside the allowed hero/divider/explanatory zones. " +
      "Keep free-mode graphics in tp-free-hero-art, tp-free-divider, or one standalone explanatory block instead of dropping them into the reading lane."
    );
  }
}

function extractTextFromBlock(blockHtml) {
  return extractReadableText(blockHtml);
}

function countComponentUsage(htmlContent) {
  return {
    hero: countClassToken(htmlContent, "wx-hero-card"),
    intro: countClassToken(htmlContent, "wx-intro-card"),
    section: countClassToken(htmlContent, "wx-section-card"),
    metricGrid: countClassToken(htmlContent, "wx-metric-grid"),
    metricCard: countClassToken(htmlContent, "wx-metric-card"),
    compareGrid: countClassToken(htmlContent, "wx-compare-grid"),
    compareCard: countClassToken(htmlContent, "wx-compare-card"),
    timeline: countClassToken(htmlContent, "wx-timeline-card"),
    quote: countClassToken(htmlContent, "wx-quote-card"),
    summary: countClassToken(htmlContent, "wx-summary-card"),
    imageDropZone: countClassToken(htmlContent, "wx-image-drop-zone"),
  };
}

function validateNativeImageUsage(htmlContent) {
  const counts = countComponentUsage(htmlContent);
  const pageTone = getArticlePageTone(htmlContent);
  const template = getArticleContentTemplate(htmlContent);
  const family = getArticleFamily(htmlContent);

  if (counts.imageDropZone === 0) return;
  if (
    pageTone === "event-notice"
    || ["event-notice", "weekly-report", "knowledge-article", "case-recap"].includes(template)
    || (family && READING_PRIORITY_FAMILIES.has(family))
  ) {
    throw new Error(
      "Image guard: this page still contains wx-image-drop-zone. " +
      "Use native <img> blocks for final delivery pages so the layout reads like a finished document."
    );
  }
}

function validateContentTemplateStructure(htmlContent) {
  const template = getArticleContentTemplate(htmlContent);
  if (!template) return;

  const counts = countComponentUsage(htmlContent);
  const metricCardTexts = collectBalancedBlocksByClass(htmlContent, "wx-metric-card", ["div"])
    .map(extractTextFromBlock)
    .filter(Boolean);
  const verboseMetricCards = metricCardTexts.filter((text) => text.length > 52);

  if (template === "event-notice" && getArticlePageTone(htmlContent) !== "event-notice") {
    throw new Error(
      "Template guard: data-content-template=\"event-notice\" must be paired with data-page-tone=\"event-notice\"."
    );
  }

  if (template === "weekly-report" && counts.metricGrid + counts.compareGrid === 0) {
    throw new Error(
      "Template guard: weekly-report pages should include at least one wx-metric-grid or wx-compare-grid so progress can be scanned quickly."
    );
  }

  if (template === "release-brief" && counts.section < 2 && (counts.metricGrid + counts.compareGrid) === 0) {
    throw new Error(
      "Template guard: release-brief pages need at least two section cards or one data block so the release is not reduced to a single hero card."
    );
  }

  if (template === "case-recap" && counts.timeline + counts.compareGrid + counts.summary === 0) {
    throw new Error(
      "Template guard: case-recap pages should include a timeline, compare grid, or summary card to make the recap structure visible."
    );
  }

  if (["event-notice", "weekly-report", "release-brief"].includes(template) && verboseMetricCards.length > 0) {
    throw new Error(
      `Template guard: found ${verboseMetricCards.length} overly verbose wx-metric-card block(s). ` +
      "Move prose-heavy content into section cards and keep metric cards short."
    );
  }
}

function validateArticleDesign(htmlContent) {
  validateGridLayouts(htmlContent);
  validateDecorativeGraphics(htmlContent);
  validateSectionHeadingSystems(htmlContent);
  validateSvgGrammarSemantics(htmlContent);
  validateDividerOrnaments(htmlContent);
  validateNativeImageUsage(htmlContent);
  validateContentTemplateStructure(htmlContent);
  validateFreeModeDesign(htmlContent);
}

function findDefaultLogoPath() {
  const logoDir = path.join(SKILL_DIR, "logos");
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
    const absolutePath = path.join(logoDir, filename);
    if (fs.existsSync(absolutePath)) return absolutePath;
  }
  return null;
}

function resolveLogoOptions(args) {
  const settings = loadSettings();
  const enabledOverride = parseBoolean(args["logo-enabled"]);
  const enabled = enabledOverride === null ? settings.logo.enabled !== false : enabledOverride;

  return {
    enabled,
    path: args.logo ? path.resolve(args.logo) : findDefaultLogoPath(),
    title: args["logo-title"] || settings.logo.title,
    subtitle: args["logo-subtitle"] || settings.logo.subtitle,
  };
}

function buildLogoHtml(logoOptions) {
  if (!logoOptions.enabled || !logoOptions.path || !fs.existsSync(logoOptions.path)) return "";
  const logoBase64 = fs.readFileSync(logoOptions.path).toString("base64");
  const ext = path.extname(logoOptions.path).slice(1).toLowerCase();
  const title = escapeHtml(logoOptions.title || "品牌名称");
  const subtitle = escapeHtml(logoOptions.subtitle || "品牌描述");
  const mime = ext === "svg" ? "image/svg+xml" : `image/${ext === "jpg" ? "jpeg" : ext}`;
  return `
<div class="phone-brand-banner">
  <div class="phone-brand-mark">
    <img src="data:${mime};base64,${logoBase64}" alt="Logo">
  </div>
  <div class="phone-brand-copy">
    <strong contenteditable="true">${title}</strong>
    <small contenteditable="true">${subtitle}</small>
  </div>
</div>`;
}

const MOBILE_WIDTH = 375; // 移动端逻辑宽度（用于CSS变量）
const EXPORT_SCALE_OPTIONS = {
  '2x': { viewportWidth: 750, outputWidth: 750 },      // 750px - 标准高清
  '3x': { viewportWidth: 1125, outputWidth: 1125 },    // 1125px - 超高清
  '1080': { viewportWidth: 1080, outputWidth: 1080 }   // 1080px - 兼容旧版本
};
// 默认使用 1080px（与 v1.7.0 保持一致）
const DEFAULT_SCALE = '1080';

function buildStandalonePage(htmlContent, cssBundle, cssVarsBlock, preset, logoHtml, editorBundle) {
  const editorJs = String(editorBundle || "").replace(/<\/script/gi, "<\\/script");
  // Sanitize: html2canvas.min.js may contain literal "</script>" which breaks inline embedding
  const html2canvasJs = fs.readFileSync(path.join(SKILL_DIR, 'assets', 'html2canvas.min.js'), 'utf-8')
    .replace(/<\/script/gi, '<\\/script');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>Tianphoto</title>
<style>
:root {
${cssVarsBlock}
--mobile-width: ${MOBILE_WIDTH}px;
}
${cssBundle}
</style>
</head>
<body class="article-page">
<div class="article-container">
${logoHtml}
${htmlContent}
</div>
<script>${html2canvasJs}<\/script>
<script>${editorJs}<\/script>
</body>
</html>`;
}

/**
 * 查找系统已安装的 Chrome / Chromium 可执行文件。
 * 支持 macOS、Linux、Windows 常见路径，无需安装 Puppeteer 或下载浏览器。
 */
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

  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  // 尝试 which
  try {
    return execSync("which google-chrome || which chromium || which chromium-browser", {
      encoding: "utf-8",
    }).trim().split("\n")[0];
  } catch {
    return null;
  }
}

/**
 * 加载 puppeteer-core（优先）或 puppeteer。
 * puppeteer-core 不自带浏览器下载，配合 findChrome() 零依赖使用。
 * 如果都没装，给出明确的安装指引。
 */
function loadPuppeteer() {
  // 1) 尝试 puppeteer-core（轻量，不下载浏览器）
  const tryRequire = (name) => {
    try { return require(name); } catch { return null; }
  };

  let ppt = tryRequire("puppeteer-core") || tryRequire("puppeteer");
  if (ppt) return ppt;

  // 2) 尝试全局安装的
  try {
    const globalRoot = execSync("npm root -g", { encoding: "utf-8" }).trim();
    ppt = tryRequire(path.join(globalRoot, "puppeteer-core")) || tryRequire(path.join(globalRoot, "puppeteer"));
    if (ppt) return ppt;
  } catch {}

  return null;
}

async function exportPng(pagePath, outputDir, baseName, sliceHeight, scaleOption = DEFAULT_SCALE) {
  const puppeteer = loadPuppeteer();
  if (!puppeteer) {
    console.error([
      "PNG export requires puppeteer-core (lightweight, no browser download).",
      "",
      "Install with ONE command:",
      "  npm install -g puppeteer-core",
      "",
      "That's it! Tianphoto will use your system Chrome automatically.",
      "(No need to install full puppeteer or download Chromium)",
    ].join("\n"));
    process.exit(1);
  }

  const chromePath = findChrome();
  if (!chromePath) {
    console.error("No Chrome/Chromium found on this system. Please install Google Chrome.");
    process.exit(1);
  }
  console.log(`Using browser: ${chromePath}`);

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: chromePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    const scaleConfig = EXPORT_SCALE_OPTIONS[scaleOption] || EXPORT_SCALE_OPTIONS[DEFAULT_SCALE];
    const outputScale = scaleConfig.outputWidth / MOBILE_WIDTH;

    // 维持桌面预览同款断点，同时把最终截图缩放到目标像素宽度。
    await page.setViewport({
      width: scaleConfig.viewportWidth,
      height: 800, 
      deviceScaleFactor: outputScale
    });

    await page.goto(`file://${pagePath}`, { waitUntil: "networkidle0", timeout: 30000 });
    await page.waitForSelector(".article-container");
    await page.addStyleTag({
      content: ".editor-toolbar, .export-overlay, .editor-toast { display: none !important; }"
    });
    await page.evaluate(() => (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve());
    await new Promise((r) => setTimeout(r, 500));

    const dims = await page.evaluate(() => {
      const el = document.querySelector(".article-container");
      const rect = el.getBoundingClientRect();
      return {
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY,
        width: Math.round(rect.width),
        height: Math.max(Math.ceil(rect.height), el.scrollHeight)
      };
    });

    const outputWidth = Math.round(dims.width * outputScale);
    const outputHeight = Math.round(dims.height * outputScale);
    console.log(`Export layout: ${dims.width}x${dims.height} CSS px -> ${outputWidth}x${outputHeight} px (${scaleOption} mode)`);

    if (sliceHeight <= 0 || outputHeight <= sliceHeight) {
      const outPath = path.join(outputDir, `${baseName}.png`);
      const surface = await page.$(".article-container");
      await surface.screenshot({ path: outPath, type: "png" });
      console.log(`PNG: ${outPath}`);
    } else {
      const sliceCssHeight = sliceHeight / outputScale;
      const count = Math.ceil(dims.height / sliceCssHeight);
      console.log(`Slicing into ${count} parts`);
      for (let i = 0; i < count; i++) {
        const y = i * sliceCssHeight;
        const h = Math.min(sliceCssHeight, dims.height - y);
        const outPath = path.join(outputDir, `${baseName}_${String(i + 1).padStart(2, "0")}.png`);
        await page.screenshot({
          path: outPath,
          type: "png",
          clip: { x: dims.x, y: dims.y + y, width: dims.width, height: h },
          captureBeyondViewport: true
        });
        console.log(`PNG: ${outPath} (${Math.round(h * outputScale)}px)`);
      }
    }
  } finally {
    await browser.close();
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const htmlFile = args._[0];

  if (!htmlFile) {
    console.error(
      "Usage: node render-image.js <html-file> [--output dir] [--preset id] " +
      "[--logo path] [--logo-title text] [--logo-subtitle text] [--logo-enabled bool] " +
      "[--png] [--slice-height px]"
    );
    process.exit(1);
  }

  const htmlPath = path.resolve(htmlFile);
  if (!fs.existsSync(htmlPath)) {
    console.error(`File not found: ${htmlPath}`);
    process.exit(1);
  }

  const useDefaultOutputDir = !args.output;
  const outputDir = useDefaultOutputDir ? DEFAULT_OUTPUT_DIR : path.resolve(args.output);
  const sliceHeight = parseInt(args["slice-height"] || "1520", 10);
  const wantPng = !!args.png;

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const bundledAssets = ensureBundledAssets(SKILL_DIR);
  const cssBundle = [
    bundledAssets.cssBundle,
    fs.readFileSync(FREE_CSS_PATH, "utf-8"),
  ].join("\n\n");
  const presetsData = JSON.parse(fs.readFileSync(PRESETS_PATH, "utf-8"));
  const rawHtmlContent = fs.readFileSync(htmlPath, "utf-8");
  const { html: inputArticleHtml, hadOuterDocument } = sanitizeArticleFragment(rawHtmlContent);
  const preset = loadPreset(presetsData, args.preset, inputArticleHtml);
  const metadataArticleHtml = applyPresetMetadata(inputArticleHtml, preset);
  const normalizedArticleHtml = normalizeSemanticGraphics(metadataArticleHtml, preset);
  const dividerNormalization = normalizeDividerOrnaments(normalizedArticleHtml, preset);
  const htmlContent = dividerNormalization.html;
  validateArticleDesign(htmlContent);
  const allVars = { ...presetsData.baseVars, ...preset.vars };
  const cssVarsBlock = Object.entries(allVars).map(([k, v]) => `  ${k}: ${v};`).join("\n");
  const logoHtml = buildLogoHtml(resolveLogoOptions(args));
  const baseName = path.basename(htmlFile, path.extname(htmlFile));
  const outputBaseName = useDefaultOutputDir
    ? `${baseName}-${buildTimestampLabel()}`
    : baseName;

  console.log(`Preset: ${preset.id} (${preset.name})`);
  console.log(`Content template: ${getArticleContentTemplate(htmlContent)}`);
  if (hadOuterDocument) {
    console.log("Sanitized input: extracted the <article> fragment from a full HTML document.");
  }
  if (dividerNormalization.removedCount > 0) {
    console.log(
      `Divider cleanup: removed ${dividerNormalization.removedCount} decorative divider(s) ` +
      `for ${dividerNormalization.strategy.reason || "the current preset"}.`
    );
  } else if (dividerNormalization.replacedCount > 0) {
    console.log(
      `Divider cleanup: replaced ${dividerNormalization.replacedCount} generic divider(s) ` +
      `with ${dividerNormalization.strategy.variant}.`
    );
  }

  // 1. Always output standalone HTML page
  const standaloneHtml = buildStandalonePage(
    htmlContent,
    cssBundle,
    cssVarsBlock,
    preset,
    logoHtml,
    bundledAssets.editorBundle
  );
  const htmlOutPath = path.join(outputDir, `${outputBaseName}-page.html`);
  fs.writeFileSync(htmlOutPath, standaloneHtml, "utf-8");
  console.log(`HTML page: ${htmlOutPath}`);

  // 2. 自动推送到会话
  const pushScript = path.join(SKILL_DIR, "scripts", "push-to-session.js");
  if (fs.existsSync(pushScript)) {
    console.log("[Tianphoto] 正在推送文件到会话...");
    try {
      const { execSync } = require("child_process");
      const pushResult = execSync(
        `node "${pushScript}" "${htmlOutPath}"`,
        { encoding: "utf-8", timeout: 30000, cwd: SKILL_DIR }
      );
      console.log(pushResult);
      const resultMatch = String(pushResult).match(/TIANPHOTO_PUSH_RESULT:(.+)$/m);
      if (resultMatch) {
        try {
          const parsed = JSON.parse(resultMatch[1]);
          console.log(
            `[Tianphoto] Push summary: ${parsed.success ? "sent back to session" : "saved locally only"} ` +
            `via ${parsed.method}.`
          );
        } catch (_err) {}
      }
    } catch (pushErr) {
      // 推送失败不影响主流程，仅记录日志
      console.log("[Tianphoto] 自动推送可能失败，文件已保存到本地:", htmlOutPath);
    }
  }

  // 3. Optionally export PNG
  if (wantPng) {
    const scaleOption = args.scale || DEFAULT_SCALE;
    await exportPng(htmlOutPath, outputDir, outputBaseName, sliceHeight, scaleOption);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
