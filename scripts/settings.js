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
});

function mergeSettings(userSettings = {}) {
  return {
    ...DEFAULT_SETTINGS,
    ...userSettings,
    logo: {
      ...DEFAULT_SETTINGS.logo,
      ...(userSettings.logo || {}),
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
  saveSettings,
};
