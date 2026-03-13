#!/usr/bin/env node

const { loadSettings, saveSettings, SETTINGS_PATH } = require("./settings");

function printUsage() {
  console.log([
    "Usage:",
    "  node tp-config.js show",
    "  node tp-config.js logo on",
    "  node tp-config.js logo off",
    "  node tp-config.js logo title <text>",
    "  node tp-config.js logo subtitle <text>",
  ].join("\n"));
}

function printSettings() {
  const settings = loadSettings();
  console.log(JSON.stringify({
    settings_path: SETTINGS_PATH,
    logo: settings.logo,
  }, null, 2));
}

function requireValue(value, label) {
  const normalized = value.trim();
  if (!normalized) {
    console.error(`Missing ${label}.`);
    process.exit(1);
  }
  return normalized;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === "show") {
    printSettings();
    return;
  }

  if (args[0] !== "logo" || args.length < 2) {
    printUsage();
    process.exit(1);
  }

  const settings = loadSettings();
  const action = args[1];

  if (action === "on") {
    settings.logo.enabled = true;
    saveSettings(settings);
    console.log("Logo banner enabled.");
    return;
  }

  if (action === "off") {
    settings.logo.enabled = false;
    saveSettings(settings);
    console.log("Logo banner disabled.");
    return;
  }

  if (action === "title") {
    settings.logo.title = requireValue(args.slice(2).join(" "), "logo title");
    saveSettings(settings);
    console.log(`Logo title set to: ${settings.logo.title}`);
    return;
  }

  if (action === "subtitle") {
    settings.logo.subtitle = requireValue(args.slice(2).join(" "), "logo subtitle");
    saveSettings(settings);
    console.log(`Logo subtitle set to: ${settings.logo.subtitle}`);
    return;
  }

  printUsage();
  process.exit(1);
}

main();
