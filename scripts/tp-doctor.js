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

function readPresetCount() {
  const presets = JSON.parse(fs.readFileSync(PRESETS_PATH, "utf-8"));
  return Array.isArray(presets.presets) ? presets.presets.length : 0;
}

function diagnoseHtml(htmlPath) {
  const absolutePath = path.resolve(htmlPath);
  if (!fs.existsSync(absolutePath)) {
    return { path: absolutePath, ok: false, error: "File not found" };
  }

  const raw = fs.readFileSync(absolutePath, "utf-8");
  const articleCount = (raw.match(/<article\b/gi) || []).length;
  const dividerCount = (raw.match(/wx-divider-ornament/gi) || []).length;
  const gridMatches = [...raw.matchAll(/grid-template-columns\s*:\s*([^;"]+)/gi)];
  const riskyGrids = gridMatches
    .map((match) => match[1].trim())
    .filter((template) => /repeat\(\s*[3-9]\s*,/i.test(template) || /\b1fr\b.*\b1fr\b.*\b1fr\b/i.test(template));

  return {
    path: absolutePath,
    ok: articleCount === 1,
    article_count: articleCount,
    has_document_tags: /<(?:html|head|body)\b/i.test(raw),
    ui_mode: /data-ui-mode=(['"])free\1/i.test(raw) ? "free" : "rule",
    preset: raw.match(/data-preset=(['"])([^'"]+)\1/i)?.[2] || null,
    divider_count: dividerCount,
    risky_grid_templates: riskyGrids,
  };
}

function main() {
  const args = process.argv.slice(2);
  const settings = loadSettings();
  const htmlDiagnosis = args[0] ? diagnoseHtml(args[0]) : null;

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
    preset_count: readPresetCount(),
    html_diagnosis: htmlDiagnosis,
  }, null, 2));
}

main();
