"use strict";

const CONTENT_TEMPLATE_RULES = {
  "event-notice": {
    id: "event-notice",
    preferredHeadingSystem: "index-led",
    allowImageDropZone: false,
    allowLegacyDecor: false,
    allowBadgeArt: false,
    defaultMarkKind: "registration",
    hero_scene_candidates: ["paper-fold", "ribbon-flow", "museum-frame"],
    approved_infographic_kinds: ["path-map", "process-track"],
    max_inline_infographics: 1,
    keywords: ["招募", "报名", "活动", "地点", "时间", "日程", "通知", "公告", "训练营", "路演", "参会", "流程", "安排"],
  },
  "weekly-report": {
    id: "weekly-report",
    preferredHeadingSystem: "index-led",
    allowImageDropZone: false,
    allowLegacyDecor: false,
    allowBadgeArt: false,
    defaultMarkKind: "delivery",
    hero_scene_candidates: ["editorial-beam", "signal-grid", "paper-fold"],
    approved_infographic_kinds: ["evidence-stack", "compare-grid", "path-map", "process-track"],
    max_inline_infographics: 1,
    keywords: ["周报", "本周", "下周", "完成", "进展", "风险", "复盘", "里程碑", "问题", "计划", "状态"],
  },
  "release-brief": {
    id: "release-brief",
    preferredHeadingSystem: "index-led",
    allowImageDropZone: false,
    allowLegacyDecor: false,
    allowBadgeArt: true,
    defaultMarkKind: "delivery",
    hero_scene_candidates: ["signal-grid", "ribbon-flow", "editorial-beam"],
    approved_infographic_kinds: ["compare-grid", "node-network", "structure-breakdown", "process-track"],
    max_inline_infographics: 1,
    keywords: ["发布", "上线", "更新", "升级", "版本", "新功能", "release", "changelog", "功能点", "能力", "feature"],
  },
  "knowledge-article": {
    id: "knowledge-article",
    preferredHeadingSystem: "index-led",
    allowImageDropZone: false,
    allowLegacyDecor: false,
    allowBadgeArt: false,
    defaultMarkKind: "perspective",
    hero_scene_candidates: ["editorial-beam", "paper-fold", "constellation-map"],
    approved_infographic_kinds: ["structure-breakdown", "evidence-stack", "path-map"],
    max_inline_infographics: 1,
    keywords: ["原理", "教程", "指南", "研究", "方法", "解释", "分析", "知识", "框架", "概念", "结论"],
  },
  "case-recap": {
    id: "case-recap",
    preferredHeadingSystem: "index-led",
    allowImageDropZone: false,
    allowLegacyDecor: false,
    allowBadgeArt: false,
    defaultMarkKind: "recap",
    hero_scene_candidates: ["constellation-map", "museum-frame", "editorial-beam"],
    approved_infographic_kinds: ["process-track", "compare-grid", "evidence-stack", "node-network"],
    max_inline_infographics: 1,
    keywords: ["案例", "项目", "复盘", "拆解", "实践", "结果", "总结", "过程", "经验", "教训"],
  },
};

const CONTENT_TEMPLATE_PATTERNS = Object.values(CONTENT_TEMPLATE_RULES).map((rule) => ({
  id: rule.id,
  tokens: rule.keywords,
}));

module.exports = {
  CONTENT_TEMPLATE_RULES,
  CONTENT_TEMPLATE_PATTERNS,
};
