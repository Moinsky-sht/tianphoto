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
 *   --png                 Also export PNG (requires Puppeteer)
 *   --slice-height <px>   Max slice height for PNG (default: 1520, 0 = no slice)
 *
 * Default behavior: generates a self-contained .html file that can be opened
 * in any browser for viewing and editing. Add --png to also export images.
 */

const fs = require("fs");
const path = require("path");

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
  const match = htmlContent.match(/data-preset="([^"]+)"/);
  if (match) {
    const p = presetsData.presets.find((p) => p.id === match[1]);
    if (p) return p;
  }
  return presetsData.presets[0];
}

function buildLogoHtml(logoPath) {
  if (!logoPath || !fs.existsSync(logoPath)) return "";
  const logoBase64 = fs.readFileSync(logoPath).toString("base64");
  const ext = path.extname(logoPath).slice(1).toLowerCase();
  const mime = ext === "svg" ? "image/svg+xml" : `image/${ext === "jpg" ? "jpeg" : ext}`;
  return `
<div class="phone-brand-banner">
  <div class="phone-brand-mark">
    <img src="data:${mime};base64,${logoBase64}" alt="Logo">
  </div>
  <div class="phone-brand-copy">
    <strong contenteditable="true">品牌名称</strong>
    <small contenteditable="true">品牌描述</small>
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

async function exportPng(exportHtml, outputDir, baseName, sliceHeight) {
  let puppeteer;
  try {
    puppeteer = require("puppeteer");
  } catch {
    try {
      const { execSync } = require("child_process");
      const globalRoot = execSync("npm root -g", { encoding: "utf-8" }).trim();
      puppeteer = require(path.join(globalRoot, "puppeteer"));
    } catch {
      console.error("Puppeteer not found. Install: npm install -g puppeteer");
      return;
    }
  }

  const tempPath = path.join(outputDir, `_export_temp_${Date.now()}.html`);
  fs.writeFileSync(tempPath, exportHtml, "utf-8");

  const browser = await puppeteer.launch({
    headless: "new",
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
    console.error("Usage: node render-image.js <html-file> [--output dir] [--preset id] [--logo path] [--png] [--slice-height px]");
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
  const logoPath = args.logo ? path.resolve(args.logo) : null;

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const cssContent = fs.readFileSync(CSS_PATH, "utf-8");
  const presetsData = JSON.parse(fs.readFileSync(PRESETS_PATH, "utf-8"));
  const htmlContent = fs.readFileSync(htmlPath, "utf-8");
  const preset = loadPreset(presetsData, args.preset, htmlContent);
  const allVars = { ...presetsData.baseVars, ...preset.vars };
  const cssVarsBlock = Object.entries(allVars).map(([k, v]) => `  ${k}: ${v};`).join("\n");
  const logoHtml = buildLogoHtml(logoPath);
  const baseName = path.basename(htmlFile, path.extname(htmlFile));

  console.log(`Preset: ${preset.id} (${preset.name})`);

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
