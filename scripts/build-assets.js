#!/usr/bin/env node
"use strict";

const path = require("path");
const { ensureBundledAssets } = require("./lib/build-assets");

const SKILL_DIR = path.resolve(__dirname, "..");
const result = ensureBundledAssets(SKILL_DIR);

console.log(JSON.stringify({
  css: result.cssPath,
  editor_stable: result.editorStablePath,
  editor_compat: result.editorCompatPath,
}, null, 2));
