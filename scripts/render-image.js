#!/usr/bin/env node

/**
 * render-image.js — Tianphoto: Article HTML → Standalone Page + optional PNG
 *
 * Usage:
 *   node render-image.js <html-file> [options]
 *
 * Options:
 *   --output <dir>        Output directory (default: same dir as html file)
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
const path = require("path");
const { execSync } = require("child_process");
const { loadSettings } = require("./settings");

const SKILL_DIR = path.resolve(__dirname, "..");
const CSS_PATH = path.join(SKILL_DIR, "assets", "article-theme.css");
const PRESETS_PATH = path.join(SKILL_DIR, "assets", "presets.json");

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
  return htmlContent.replace(/<!doctype[^>]*>/gi, "").trim();
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

function sanitizeArticleFragment(htmlContent) {
  let sanitized = stripDoctype(htmlContent.replace(/^\uFEFF/, "").trim());
  let hadOuterDocument = false;

  if (/<(?:html|head|body)\b/i.test(sanitized)) {
    hadOuterDocument = true;
    sanitized = extractTagInnerHtml(sanitized, "body")
      || extractTagInnerHtml(sanitized, "html")
      || sanitized;
    sanitized = stripDoctype(sanitized);
  }

  const articleHtml = extractFirstArticle(sanitized);
  if (articleHtml) sanitized = articleHtml;

  if (/<\/?(?:html|head|body)\b/i.test(sanitized)) {
    throw new Error(
      "Input HTML still contains document-level tags after sanitization. " +
      "Provide a single <article> fragment or a saved Tianphoto page."
    );
  }

  const articleCount = (sanitized.match(/<article\b/gi) || []).length;
  if (articleCount !== 1) {
    throw new Error(`Input HTML must contain exactly one <article> root; found ${articleCount}.`);
  }

  return {
    html: sanitized,
    hadOuterDocument,
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

function pickDividerStrategy(htmlContent, preset) {
  const skin = getArticleSkin(htmlContent);
  const presetId = preset?.id || "";
  const isEditorialNewsPreset = /(journal|brief|report|bulletin|digest|briefing)/i.test(presetId);

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

      return `<div${setDividerVariantAttr(attrs, nextVariant)}>\n      ${nextInner}\n    </div>`;
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

function validateDividerOrnaments(htmlContent) {
  const dividerBlocks = htmlContent.match(/<div[^>]*class=(['"])[^'"]*wx-divider-ornament[^'"]*\1[^>]*>[\s\S]*?<\/div>/gi) || [];
  const skin = getArticleSkin(htmlContent);

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

  if (skin === "editorial" && dividerBlocks.length > 0) {
    throw new Error(
      "Divider guard: editorial/news layouts should not rely on decorative dividers. " +
      "Use card spacing, headings, and section rhythm instead."
    );
  }
}

function validateArticleDesign(htmlContent) {
  validateGridLayouts(htmlContent);
  validateDecorativeGraphics(htmlContent);
  validateDividerOrnaments(htmlContent);
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

function buildStandalonePage(htmlContent, cssContent, cssVarsBlock, preset, logoHtml) {
  const editorJs = fs.readFileSync(path.join(SKILL_DIR, 'assets', 'editor.js'), 'utf-8');
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
}
${cssContent}
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

function buildExportPage(htmlContent, cssContent, cssVarsBlock, logoHtml) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1080">
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { margin: 0; padding: 0; }
:root {
${cssVarsBlock}
}
${cssContent}
</style>
</head>
<body>
<div class="export-surface">
${logoHtml}
${htmlContent}
</div>
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

async function exportPng(exportHtml, outputDir, baseName, sliceHeight) {
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

  const tempPath = path.join(outputDir, `_export_temp_${Date.now()}.html`);
  fs.writeFileSync(tempPath, exportHtml, "utf-8");

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: chromePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 800, deviceScaleFactor: 2 });
    await page.goto(`file://${tempPath}`, { waitUntil: "networkidle0", timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    await new Promise((r) => setTimeout(r, 500));

    const dims = await page.evaluate(() => {
      const el = document.querySelector(".export-surface");
      return { width: el.scrollWidth, height: el.scrollHeight };
    });

    console.log(`Export dimensions: ${dims.width}x${dims.height}`);

    if (sliceHeight <= 0 || dims.height <= sliceHeight) {
      const outPath = path.join(outputDir, `${baseName}.png`);
      const surface = await page.$(".export-surface");
      await surface.screenshot({ path: outPath, type: "png" });
      console.log(`PNG: ${outPath}`);
    } else {
      const count = Math.ceil(dims.height / sliceHeight);
      console.log(`Slicing into ${count} parts`);
      for (let i = 0; i < count; i++) {
        const y = i * sliceHeight;
        const h = Math.min(sliceHeight, dims.height - y);
        const outPath = path.join(outputDir, `${baseName}_${String(i + 1).padStart(2, "0")}.png`);
        await page.screenshot({ path: outPath, type: "png", clip: { x: 0, y, width: 1080, height: h } });
        console.log(`PNG: ${outPath} (${h}px)`);
      }
    }
  } finally {
    await browser.close();
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
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

  const outputDir = args.output ? path.resolve(args.output) : path.join(require("os").homedir(), "Desktop");
  const sliceHeight = parseInt(args["slice-height"] || "1520", 10);
  const wantPng = !!args.png;

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const cssContent = fs.readFileSync(CSS_PATH, "utf-8");
  const presetsData = JSON.parse(fs.readFileSync(PRESETS_PATH, "utf-8"));
  const rawHtmlContent = fs.readFileSync(htmlPath, "utf-8");
  const { html: inputArticleHtml, hadOuterDocument } = sanitizeArticleFragment(rawHtmlContent);
  const preset = loadPreset(presetsData, args.preset, inputArticleHtml);
  const dividerNormalization = normalizeDividerOrnaments(inputArticleHtml, preset);
  const htmlContent = dividerNormalization.html;
  validateArticleDesign(htmlContent);
  const allVars = { ...presetsData.baseVars, ...preset.vars };
  const cssVarsBlock = Object.entries(allVars).map(([k, v]) => `  ${k}: ${v};`).join("\n");
  const logoHtml = buildLogoHtml(resolveLogoOptions(args));
  const baseName = path.basename(htmlFile, path.extname(htmlFile));

  console.log(`Preset: ${preset.id} (${preset.name})`);
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
  const standaloneHtml = buildStandalonePage(htmlContent, cssContent, cssVarsBlock, preset, logoHtml);
  const htmlOutPath = path.join(outputDir, `${baseName}-page.html`);
  fs.writeFileSync(htmlOutPath, standaloneHtml, "utf-8");
  console.log(`HTML page: ${htmlOutPath}`);

  // 2. Optionally export PNG
  if (wantPng) {
    const exportHtml = buildExportPage(htmlContent, cssContent, cssVarsBlock, logoHtml);
    await exportPng(exportHtml, outputDir, baseName, sliceHeight);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
