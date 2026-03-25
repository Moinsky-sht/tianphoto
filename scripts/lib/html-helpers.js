"use strict";

function stripDoctype(htmlContent) {
  return String(htmlContent || "").replace(/<!doctype[^>]*>/gi, "").trim();
}

function extractTagInnerHtml(htmlContent, tagName) {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = String(htmlContent || "").match(pattern);
  return match ? match[1].trim() : null;
}

function extractFirstArticle(htmlContent) {
  const match = String(htmlContent || "").match(/<article\b[\s\S]*?<\/article>/i);
  return match ? match[0].trim() : null;
}

function extractReadableText(htmlContent) {
  return String(htmlContent || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function countClassToken(htmlContent, className) {
  const regex = new RegExp(`\\b${className}\\b`, "g");
  const matches = String(htmlContent || "").match(regex);
  return matches ? matches.length : 0;
}

function findMatchingTagEnd(html, openTagStart, tagName) {
  const tagRegex = new RegExp(`<\\/?${tagName}\\b[^>]*>`, "gi");
  tagRegex.lastIndex = openTagStart;
  let depth = 0;
  let match;

  while ((match = tagRegex.exec(html))) {
    const token = match[0];
    const isClosing = /^<\//.test(token);
    const selfClosing = /\/>$/.test(token);

    if (!isClosing && !selfClosing) {
      depth += 1;
    } else if (isClosing) {
      depth -= 1;
      if (depth === 0) return tagRegex.lastIndex;
    }
  }

  return -1;
}

function extractBalancedBlockFromOpenTag(html, openTagIndex, tagName) {
  const endIndex = findMatchingTagEnd(html, openTagIndex, tagName);
  return endIndex === -1 ? null : html.slice(openTagIndex, endIndex);
}

function collectBalancedBlocksByClass(htmlContent, className, tagNames = ["div", "section"]) {
  const tagAlternation = tagNames.join("|");
  const regex = new RegExp(
    `<(${tagAlternation})\\b([^>]*class=(['"])[^'"]*\\b${className}\\b[^'"]*\\3[^>]*)>`,
    "gi"
  );
  const blocks = [];
  let match;

  while ((match = regex.exec(htmlContent))) {
    const block = extractBalancedBlockFromOpenTag(htmlContent, match.index, match[1]);
    if (!block) continue;
    blocks.push(block);
    regex.lastIndex = match.index + block.length;
  }

  return blocks;
}

function sanitizeArticleFragment(htmlContent) {
  let sanitized = stripDoctype(String(htmlContent || "").replace(/^\uFEFF/, "").trim());
  let hadOuterDocument = false;

  if (/<(?:html|head|body)\b/i.test(sanitized)) {
    hadOuterDocument = true;
    sanitized = extractTagInnerHtml(sanitized, "body")
      || extractTagInnerHtml(sanitized, "html")
      || sanitized;
    sanitized = stripDoctype(sanitized);
  }

  const extractedArticle = extractFirstArticle(sanitized);
  if (extractedArticle) sanitized = extractedArticle;

  return {
    html: sanitized,
    hadOuterDocument,
    hasArticleRoot: /^<article\b/i.test(sanitized),
    articleCount: (sanitized.match(/<article\b/gi) || []).length,
  };
}

module.exports = {
  stripDoctype,
  extractTagInnerHtml,
  extractFirstArticle,
  extractReadableText,
  countClassToken,
  findMatchingTagEnd,
  extractBalancedBlockFromOpenTag,
  collectBalancedBlocksByClass,
  sanitizeArticleFragment,
};
