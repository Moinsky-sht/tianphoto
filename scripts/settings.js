const fs = require("fs");
const path = require("path");

const SKILL_DIR = path.resolve(__dirname, "..");
const SETTINGS_PATH = path.join(SKILL_DIR, "local-settings.json");
const DEFAULT_SETTINGS = Object.freeze({
  logo: {
    enabled: true,
    title: "品牌名称",
    subtitle: "品牌描述",
  },
  ui: {
    mode: "rule",
    free_variants: 2,
    max_free_variants: 5,
  },
});

function normalizeFreeVariants(value, fallback = DEFAULT_SETTINGS.ui.free_variants) {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(DEFAULT_SETTINGS.ui.max_free_variants, Math.max(1, parsed));
}

function mergeSettings(userSettings = {}) {
  return {
    ...DEFAULT_SETTINGS,
    ...userSettings,
    logo: {
      ...DEFAULT_SETTINGS.logo,
      ...(userSettings.logo || {}),
    },
    ui: {
      ...DEFAULT_SETTINGS.ui,
      ...(userSettings.ui || {}),
      mode: userSettings.ui?.mode === "free" ? "free" : DEFAULT_SETTINGS.ui.mode,
      free_variants: normalizeFreeVariants(userSettings.ui?.free_variants),
      max_free_variants: DEFAULT_SETTINGS.ui.max_free_variants,
    },
  };
}

function loadSettings() {
  if (!fs.existsSync(SETTINGS_PATH)) return mergeSettings();
  const raw = fs.readFileSync(SETTINGS_PATH, "utf-8");
  if (!raw.trim()) return mergeSettings();
  return mergeSettings(JSON.parse(raw));
}

function saveSettings(nextSettings) {
  const merged = mergeSettings(nextSettings);
  fs.writeFileSync(SETTINGS_PATH, `${JSON.stringify(merged, null, 2)}\n`, "utf-8");
  return merged;
}

module.exports = {
  DEFAULT_SETTINGS,
  SETTINGS_PATH,
  loadSettings,
  mergeSettings,
  normalizeFreeVariants,
  saveSettings,
};
