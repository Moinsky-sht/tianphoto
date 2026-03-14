#!/usr/bin/env node

const { loadSettings, normalizeFreeVariants, saveSettings, SETTINGS_PATH } = require("./settings");

function printUsage() {
  console.log([
    "Usage:",
    "  node tp-config.js show",
    "  node tp-config.js logo on",
    "  node tp-config.js logo off",
    "  node tp-config.js logo title <text>",
    "  node tp-config.js logo subtitle <text>",
    "  node tp-config.js ui rule",
    "  node tp-config.js ui free [count]",
  ].join("\n"));
}

function printSettings() {
  const settings = loadSettings();
  console.log(JSON.stringify({
    settings_path: SETTINGS_PATH,
    logo: settings.logo,
    ui: settings.ui,
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

  const settings = loadSettings();

  if (args[0] === "logo") {
    if (args.length < 2) {
      printUsage();
      process.exit(1);
    }

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
  }

  if (args[0] === "ui") {
    const action = args[1];

    if (action === "rule") {
      settings.ui.mode = "rule";
      saveSettings(settings);
      console.log("UI mode set to: rule");
      return;
    }

    if (action === "free") {
      settings.ui.mode = "free";
      settings.ui.free_variants = normalizeFreeVariants(args[2]);
      saveSettings(settings);
      console.log(`UI mode set to: free (${settings.ui.free_variants} variant${settings.ui.free_variants > 1 ? "s" : ""})`);
      return;
    }
  }

  printUsage();
  process.exit(1);
}

main();
