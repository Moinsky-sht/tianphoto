#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
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

function extractTagInnerHtml(htmlContent, tagName) {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = htmlContent.match(pattern);
  return match ? match[1].trim() : null;
}

function extractFirstArticle(htmlContent) {
  const match = htmlContent.match(/<article\b[\s\S]*?<\/article>/i);
  return match ? match[0].trim() : null;
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

  return {
    path: absolutePath,
    ok: articleCount === 1 && freeModeOk,
    article_count: articleCount,
    has_document_tags: /<(?:html|head|body)\b/i.test(raw),
    ui_mode: uiMode,
    preset: articleHtml.match(/data-preset=(['"])([^'"]+)\1/i)?.[2] || null,
    style_family: articleHtml.match(/data-style-family=(['"])([^'"]+)\1/i)?.[2] || null,
    style_archetype: articleHtml.match(/data-style-archetype=(['"])([^'"]+)\1/i)?.[2] || null,
    divider_count: dividerCount,
    uses_free_helpers: freeHelpers.length > 0,
    free_helpers_found: freeHelpers,
    hardcoded_color_tokens: hardcodedColorTokens,
    risky_grid_templates: riskyGrids,
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
