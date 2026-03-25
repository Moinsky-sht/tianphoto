"use strict";

const { FAMILY_VISUAL_SYSTEMS } = require("./family-matrix");
const { CONTENT_TEMPLATE_RULES } = require("./content-template-rules");

const DEFAULT_VISUAL_SYSTEM = {
  mode: "reading",
  reading_priority: "reading-first",
  svg_grammar: "editorial-schematic",
  hero_scene_style: "editorial-beam",
  hero_scene_candidates: ["editorial-beam", "paper-fold", "constellation-map"],
  scene_density: "quiet",
  section_mark_style: "reading",
  mark_prominence: "low",
  divider_style: "editorial-notch",
  inline_infographic_style: "evidence-stack",
  approved_infographic_kinds: ["evidence-stack", "structure-breakdown", "path-map"],
  hero_anchor: "top-band",
  mark_placement: "caption-edge",
  graphic_quietness: "high",
  title_safe: "strict",
  frame_budget: "single",
  svg_noise_budget: "tight",
  stroke_weight: "thin",
  corner_language: "soft",
  fill_strategy: "light-tint",
  density_level: "low",
  geometry_bias: "editorial-guides",
};

const HERO_SCENE_LIBRARY = {
  "ribbon-flow": { label: "Ribbon Flow" },
  "signal-grid": { label: "Signal Grid" },
  "paper-fold": { label: "Paper Fold" },
  "constellation-map": { label: "Constellation Map" },
  "editorial-beam": { label: "Editorial Beam" },
  "museum-frame": { label: "Museum Frame" },
};

const INLINE_INFOGRAPHIC_LIBRARY = {
  "process-track": { label: "Process Track" },
  "node-network": { label: "Node Network" },
  "compare-grid": { label: "Compare Grid" },
  "path-map": { label: "Path Map" },
  "evidence-stack": { label: "Evidence Stack" },
  "structure-breakdown": { label: "Structure Breakdown" },
};

const MARK_KIND_LIBRARY = {
  registration: {
    label: "报名 / 通知",
    tokens: ["报名", "招募", "通知", "参与", "参加", "报名方式", "参加方式", "报名须知", "register", "signup", "join", "notice"],
  },
  organization: {
    label: "组织 / 联合发起",
    tokens: ["组织", "主办", "承办", "支持单位", "协办", "联合", "机构", "发起", "co-host", "partner", "organization", "community"],
  },
  task: {
    label: "目标 / 开发任务",
    tokens: ["目标", "任务", "开发", "产品", "建设", "行动项", "交付目标", "project", "task", "build", "objective"],
  },
  schedule: {
    label: "日程 / 时间节点",
    tokens: ["日程", "安排", "议程", "时间", "阶段", "里程碑", "排期", "timeline", "schedule", "milestone", "deadline"],
  },
  qualification: {
    label: "资格 / 权益",
    tokens: ["资格", "权益", "入选", "营员", "要求", "对象", "适用人群", "eligibility", "benefit", "qualification", "member"],
  },
  awards: {
    label: "奖项 / 证书",
    tokens: ["奖项", "评奖", "评审", "一等奖", "二等奖", "三等奖", "证书", "奖学金", "award", "prize", "certificate", "trophy"],
  },
  growth: {
    label: "后续机会 / 增长路径",
    tokens: ["后续", "发展", "机会", "基金", "投资", "成长", "路径", "晋升", "growth", "future", "opportunity", "path"],
  },
  perspective: {
    label: "观点 / 方法定位",
    tokens: ["定位", "观点", "角色", "原则", "态度", "价值", "洞察", "视角", "perspective", "principle", "insight", "thesis"],
  },
  method: {
    label: "方法 / 流程",
    tokens: ["方法", "流程", "步骤", "机制", "工作方法", "打法", "strategy", "method", "workflow", "process", "framework"],
  },
  delivery: {
    label: "交付 / 成果",
    tokens: ["交付", "成果", "产出", "输出", "结果", "完成项", "deliverable", "delivery", "outcome", "result", "shipping"],
  },
  risk: {
    label: "风险 / 约束",
    tokens: ["风险", "约束", "限制", "问题", "边界", "依赖", "risk", "constraint", "issue", "guard", "blocker"],
  },
  recap: {
    label: "复盘 / 总结",
    tokens: ["复盘", "总结", "回顾", "经验", "教训", "retrospective", "recap", "summary", "takeaway"],
  },
};

const SVG_COMPOSITION_ROLE_RULES = {
  "hero-scene": {
    label: "Hero Scene",
    rule_hosts: ["wx-hero-mesh"],
    free_hosts: ["tp-free-hero-art"],
  },
  "section-mark": {
    label: "Section Mark",
    rule_hosts: ["wx-section-heading", "wx-title-row"],
    free_hosts: [],
  },
  divider: {
    label: "Divider",
    rule_hosts: ["wx-divider-ornament"],
    free_hosts: ["tp-free-divider"],
  },
  "inline-infographic": {
    label: "Inline Infographic",
    rule_hosts: ["wx-inline-graphic"],
    free_hosts: ["tp-free-panel", "tp-free-note", "tp-free-quote"],
  },
  "margin-ornament": {
    label: "Margin Ornament",
    rule_hosts: [],
    free_hosts: [],
  },
};

const DEFAULT_MARK_KIND_BY_TEMPLATE = Object.fromEntries(
  Object.values(CONTENT_TEMPLATE_RULES).map((rule) => [rule.id, rule.defaultMarkKind])
);

const TEMPLATE_SCENE_FALLBACKS = Object.fromEntries(
  Object.values(CONTENT_TEMPLATE_RULES).map((rule) => [rule.id, rule.hero_scene_candidates?.[0] || DEFAULT_VISUAL_SYSTEM.hero_scene_style])
);

const TEMPLATE_INFOGRAPHIC_FALLBACKS = Object.fromEntries(
  Object.values(CONTENT_TEMPLATE_RULES).map((rule) => [rule.id, rule.approved_infographic_kinds?.[0] || DEFAULT_VISUAL_SYSTEM.inline_infographic_style])
);

const ARCHETYPE_SCENE_HINTS = {
  "cover-story": ["museum-frame", "editorial-beam"],
  "future-signal": ["signal-grid", "constellation-map"],
  "muse-board": ["museum-frame", "ribbon-flow"],
  "atlas-essay": ["constellation-map", "paper-fold"],
  "ai-studio": ["signal-grid", "ribbon-flow"],
  "night-ledger": ["paper-fold", "signal-grid"],
};

const INFOGRAPHIC_HINTS = [
  { kind: "process-track", pattern: /流程|步骤|阶段|推进|实施|process|workflow|step/i },
  { kind: "node-network", pattern: /网络|关系|协同|节点|依赖|network|graph|node/i },
  { kind: "compare-grid", pattern: /对比|比较|before|after|versus|对照|差异/i },
  { kind: "path-map", pattern: /时间|日程|timeline|schedule|路径|轨迹|路线/i },
  { kind: "evidence-stack", pattern: /证据|数据|依据|来源|证明|evidence|proof|source/i },
  { kind: "structure-breakdown", pattern: /结构|拆解|组成|框架|architecture|structure|breakdown/i },
];

function getTemplateSvgPolicy(contentTemplate) {
  return CONTENT_TEMPLATE_RULES[contentTemplate] || CONTENT_TEMPLATE_RULES["knowledge-article"];
}

function getFamilyVisualSystem(family) {
  return FAMILY_VISUAL_SYSTEMS[family] || DEFAULT_VISUAL_SYSTEM;
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function scaleOpacity(value, scale) {
  const numeric = parseFloat(value);
  if (Number.isNaN(numeric)) return value;
  return clampNumber(numeric * scale, 0.06, 0.96).toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function getCompositionProfile(family) {
  const system = getFamilyVisualSystem(family);
  const mode = system.mode || DEFAULT_VISUAL_SYSTEM.mode;
  return {
    reading_priority: system.reading_priority || DEFAULT_VISUAL_SYSTEM.reading_priority,
    scene_density: system.scene_density || DEFAULT_VISUAL_SYSTEM.scene_density,
    mark_prominence: system.mark_prominence || DEFAULT_VISUAL_SYSTEM.mark_prominence,
    hero_anchor: system.hero_anchor || DEFAULT_VISUAL_SYSTEM.hero_anchor,
    mark_placement: system.mark_placement || DEFAULT_VISUAL_SYSTEM.mark_placement,
    graphic_quietness: system.graphic_quietness || DEFAULT_VISUAL_SYSTEM.graphic_quietness,
    title_safe: system.title_safe || (mode === "expressive" ? "guarded" : DEFAULT_VISUAL_SYSTEM.title_safe),
    frame_budget: system.frame_budget || (mode === "product" ? "balanced" : DEFAULT_VISUAL_SYSTEM.frame_budget),
    svg_noise_budget: system.svg_noise_budget || (mode === "expressive" ? "medium" : mode === "product" ? "medium" : DEFAULT_VISUAL_SYSTEM.svg_noise_budget),
  };
}

function getCompositionDecision({ family, contentTemplate, uiMode = "rule" } = {}) {
  const system = getFamilyVisualSystem(family);
  const templateRule = getTemplateSvgPolicy(contentTemplate);
  const composition = getCompositionProfile(family);
  return {
    grammar: system.svg_grammar || DEFAULT_VISUAL_SYSTEM.svg_grammar,
    composition,
    hero_scene: chooseHeroScene({ contentTemplate, family }),
    approved_infographic_kinds: getApprovedInfographicKinds(contentTemplate, family),
    max_inline_infographics: templateRule.max_inline_infographics,
    role_rules: Object.fromEntries(
      Object.entries(SVG_COMPOSITION_ROLE_RULES).map(([role, rule]) => [
        role,
        {
          ...rule,
          allowed_hosts: uiMode === "free" ? rule.free_hosts : rule.rule_hosts,
        },
      ])
    ),
  };
}

function getRolePlacementRule(role) {
  return SVG_COMPOSITION_ROLE_RULES[role] || null;
}

function getHeroNodeBudget(profile) {
  if (profile.svg_noise_budget === "tight") return profile.reading_priority === "reading-first" ? 10 : 12;
  if (profile.svg_noise_budget === "medium") return 14;
  if (profile.graphic_quietness === "low") return 18;
  return 16;
}

function getInlineInfographicNodeBudget(profile) {
  if (profile.svg_noise_budget === "tight") return 12;
  if (profile.svg_noise_budget === "medium") return 15;
  return profile.reading_priority === "reading-first" ? 16 : 18;
}

function getSceneOpacityScale(profile) {
  if (profile.scene_density === "quiet") return 0.72;
  if (profile.scene_density === "expressive") return 1.08;
  return 0.9;
}

function getQuietnessOpacityScale(profile) {
  if (profile.graphic_quietness === "high") return 0.78;
  if (profile.graphic_quietness === "low") return 1.04;
  return 0.92;
}

function getMarkStrokeScale(profile) {
  return profile.mark_prominence === "low" ? 0.92 : 1;
}

function getMarkOpacityScale(profile) {
  return profile.mark_prominence === "low" ? 0.72 : 0.94;
}

function unique(values) {
  return values.filter((value, index) => value && values.indexOf(value) === index);
}

function getStrokeWeightValue(weight, scale = "mark") {
  const map = scale === "hero"
    ? { thin: "2.6", medium: "3.2", heavy: "4.2" }
    : scale === "infographic"
    ? { thin: "2.4", medium: "3.1", heavy: "3.8" }
    : { thin: "1.7", medium: "2.05", heavy: "2.45" };
  return map[weight] || map.thin;
}

function getFillOpacity(system) {
  const fillMap = {
    "light-tint": ".12",
    outline: ".08",
    "paper-fill": ".18",
    "panel-fill": ".18",
    "ribbon-fill": ".2",
    "glow-fill": ".22",
    "solid-fill": ".26",
  };
  return fillMap[system.fill_strategy] || ".12";
}

function getDensityOpacity(system) {
  return system.density_level === "high" ? ".42" : system.density_level === "medium" ? ".28" : ".18";
}

function getCornerRadius(system, major = false) {
  const rounded = major ? "16" : "3";
  const soft = major ? "12" : "2.6";
  const square = major ? "6" : "1.2";
  const framed = major ? "10" : "2";

  if (system.corner_language === "round") return rounded;
  if (system.corner_language === "square") return square;
  if (system.corner_language === "framed") return framed;
  return soft;
}

function resolveVisualContext(familyOrStyle) {
  if (familyOrStyle && FAMILY_VISUAL_SYSTEMS[familyOrStyle]) {
    return {
      family: familyOrStyle,
      system: getFamilyVisualSystem(familyOrStyle),
      tier: getFamilyVisualSystem(familyOrStyle).section_mark_style,
    };
  }

  return {
    family: null,
    system: DEFAULT_VISUAL_SYSTEM,
    tier: familyOrStyle || DEFAULT_VISUAL_SYSTEM.section_mark_style,
  };
}

function buildMarkShell(system, stroke, fillOpacity) {
  const grammar = system.svg_grammar;
  const accentOpacity = getDensityOpacity(system);
  const shellRadius = getCornerRadius(system);

  switch (grammar) {
    case "editorial-schematic":
      return {
        before: `<path d="M5.2 7.2h4.2M14.6 7.2h4.2M5.2 16.8h5.8" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" opacity="${accentOpacity}"/>`,
        after: "",
      };
    case "ledger-wireframe":
    case "bulletin-editorial":
      return {
        before: `<path d="M6 5.8v3M18 5.8v3M6 15.2v3M18 15.2v3" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" opacity="${accentOpacity}"/>`,
        after: grammar === "bulletin-editorial"
          ? `<rect x="15.2" y="4.8" width="4" height="2.4" rx="1.2" fill="currentColor" opacity="${fillOpacity}"/>`
          : "",
      };
    case "archive-plate":
    case "salon-emblem":
    case "gallery-frame":
      return {
        before: `<rect x="4.8" y="5.2" width="14.4" height="13.6" rx="${shellRadius}" stroke="currentColor" stroke-width="${stroke}" opacity="${accentOpacity}"/>`,
        after: grammar === "salon-emblem"
          ? `<circle cx="12" cy="12" r="7.1" stroke="currentColor" stroke-width="${stroke}" opacity="${fillOpacity}"/>`
          : "",
      };
    case "atlas-annotation":
    case "aurora-orbit":
      return {
        before: `<path d="M6 15.8c2.2-4.8 5.4-7.4 9.6-7.8 1.2-.1 2.2-.6 3.1-1.4" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" opacity="${accentOpacity}"/>`,
        after: `<circle cx="17.8" cy="6.6" r="1.8" fill="currentColor" opacity="${fillOpacity}"/>`,
      };
    case "signal-panel":
    case "neon-signal":
    case "skyline-wire":
      return {
        before: grammar === "skyline-wire"
          ? `<path d="M5 8h4M15 8h4M5 16h4M15 16h4" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" opacity="${accentOpacity}"/>`
          : "",
        after: "",
      };
    case "ribbon-plaque":
    case "story-ribbon":
      return {
        before: `<path d="M6.2 8.2h11.6l-1.8 2 1.8 2H6.2l1.8-2-1.8-2Z" fill="currentColor" opacity="${fillOpacity}"/>`,
        after: "",
      };
    case "poster-block":
      return {
        before: `<path d="M5 6.2h12.6v10.6H5z" fill="currentColor" opacity="${fillOpacity}"/><path d="M17.6 6.2 19 8v8.8h-1.4" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" opacity="${accentOpacity}"/>`,
        after: "",
      };
    case "play-symbolic":
      return {
        before: `<circle cx="6.6" cy="7.4" r="2.4" fill="currentColor" opacity="${fillOpacity}"/><rect x="14.8" y="14.2" width="4.6" height="4.6" rx="${shellRadius}" fill="currentColor" opacity="${fillOpacity}"/>`,
        after: "",
      };
    default:
      return { before: "", after: "" };
  }
}

function buildMarkCore(kind, stroke, fillOpacity, tier) {
  switch (kind) {
    case "registration":
      if (tier === "product") {
        return `<rect x="7" y="8.4" width="9" height="7.4" rx="2.2" stroke="currentColor" stroke-width="${stroke}"/><path d="M9 11.2h5M9 13.7h3.6" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round"/>`;
      }
      return `<rect x="7.2" y="8.6" width="8.8" height="6.8" rx="2" stroke="currentColor" stroke-width="${stroke}"/><circle cx="15.4" cy="9.4" r="1.8" fill="currentColor" opacity="${fillOpacity}"/>`;
    case "organization":
      return `<circle cx="8" cy="9" r="2" stroke="currentColor" stroke-width="${stroke}"/><circle cx="15.8" cy="9" r="2" stroke="currentColor" stroke-width="${stroke}"/><circle cx="11.9" cy="15.2" r="2.2" ${tier === "expressive" ? `fill="currentColor" opacity="${fillOpacity}"` : `stroke="currentColor" stroke-width="${stroke}"`} /><path d="M9.5 10.6 10.8 13M14.3 10.6 13 13" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round"/>`;
    case "task":
      return `<path d="M7.2 9.2h8.2M7.2 12h9.8M7.2 14.8h6.4" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round"/><path d="M14.8 9.2 17.2 11.4l-2.4 2.2" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/>`;
    case "schedule":
      if (tier === "product") {
        return `<path d="M8 8v2M16 8v2" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round"/><rect x="6.6" y="9.5" width="10.8" height="7.8" rx="2.2" stroke="currentColor" stroke-width="${stroke}"/><circle cx="12" cy="13.6" r="1.6" fill="currentColor" opacity="${fillOpacity}"/>`;
      }
      return `<circle cx="12" cy="12" r="5.4" stroke="currentColor" stroke-width="${stroke}"/><path d="M12 9.4v3.1l2.1 1.3" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/>`;
    case "qualification":
      return `<path d="M8.6 12.4 10.8 14.4 15.4 9.8" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 6.5 17 8.2v3.6c0 2.4-1.7 4.5-5 5.8-3.3-1.3-5-3.4-5-5.8V8.2L12 6.5Z" stroke="currentColor" stroke-width="${stroke}" stroke-linejoin="round"/>`;
    case "awards":
      return `<path d="M9.2 7.2h5.6v1.8c0 1.9-1.2 3.5-2.8 4-1.6-.5-2.8-2.1-2.8-4V7.2Z" stroke="currentColor" stroke-width="${stroke}" stroke-linejoin="round"/><path d="M12 13.2v3.4M9.6 18h4.8" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round"/>`;
    case "growth":
      return `<path d="M7 15.8 10.2 12.6l2.3 2.3 4.6-4.7" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/><path d="M14.6 10.2h3.1v3.1" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/>`;
    case "perspective":
      return `<circle cx="12" cy="9" r="2.8" stroke="currentColor" stroke-width="${stroke}"/><path d="M7.4 16.8c1.2-1.9 2.8-2.9 4.6-2.9s3.4 1 4.6 2.9" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round"/><circle cx="17.2" cy="14.6" r="1.6" fill="currentColor" opacity="${fillOpacity}"/>`;
    case "method":
      return `<path d="M7.1 9h7m0 0-1.8-1.8M14.1 9l-1.8 1.8" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.1 12.4h9.8" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round"/><path d="M7.1 15.8h7m0 0-1.8-1.8M14.1 15.8l-1.8 1.8" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/>`;
    case "delivery":
      return `<rect x="7" y="8" width="3.8" height="3.8" rx="1.1" stroke="currentColor" stroke-width="${stroke}"/><rect x="13.2" y="8" width="3.8" height="3.8" rx="1.1" stroke="currentColor" stroke-width="${stroke}"/><rect x="7" y="13" width="3.8" height="3.8" rx="1.1" stroke="currentColor" stroke-width="${stroke}"/><path d="M14.2 14.8h3.2M15.8 13.2v3.2" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round"/>`;
    case "risk":
      return `<path d="M12 7.2 17.4 16.2H6.6L12 7.2Z" stroke="currentColor" stroke-width="${stroke}" stroke-linejoin="round"/><path d="M12 10.4v3.1M12 15.2h.01" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round"/>`;
    case "recap":
      return `<path d="M7.2 9.2h8.8M7.2 12h6.6M7.2 14.8h8.8" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round"/><circle cx="16.6" cy="12" r="1.8" fill="currentColor" opacity="${fillOpacity}"/>`;
    default:
      return `<path d="M7.2 9.2h8.8M7.2 12h6.2M7.2 14.8h4.2" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round"/><circle cx="16.7" cy="14.8" r="1.5" fill="currentColor" opacity="${fillOpacity}"/>`;
  }
}

function createMarkSvg(kind, familyOrStyle) {
  const { family, system, tier } = resolveVisualContext(familyOrStyle);
  const profile = getCompositionProfile(family);
  const stroke = (parseFloat(getStrokeWeightValue(system.stroke_weight, "mark")) * getMarkStrokeScale(profile)).toFixed(2);
  const fillOpacity = scaleOpacity(getFillOpacity(system), getMarkOpacityScale(profile));
  const shell = buildMarkShell(system, stroke, fillOpacity);
  const core = buildMarkCore(kind, stroke, fillOpacity, tier);

  return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" data-mark-grammar="${system.svg_grammar}" data-mark-prominence="${profile.mark_prominence}" data-svg-role="section-mark">${shell.before}${core}${shell.after}</svg>`;
}

function chooseHeroScene({ contentTemplate = "", family = "", archetype = "" }) {
  const policy = getTemplateSvgPolicy(contentTemplate);
  const familySystem = getFamilyVisualSystem(family);
  const templateCandidates = policy.hero_scene_candidates || [DEFAULT_VISUAL_SYSTEM.hero_scene_style];
  const familyCandidates = familySystem.hero_scene_candidates || [familySystem.hero_scene_style];
  const archetypeCandidates = ARCHETYPE_SCENE_HINTS[archetype] || [];

  const matchedToFamily = familyCandidates.filter((scene) => templateCandidates.includes(scene));
  const archetypeAdjusted = matchedToFamily.filter((scene) => archetypeCandidates.includes(scene));

  return archetypeAdjusted[0]
    || matchedToFamily[0]
    || templateCandidates.find((scene) => HERO_SCENE_LIBRARY[scene])
    || familySystem.hero_scene_style
    || DEFAULT_VISUAL_SYSTEM.hero_scene_style;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function scoreTokenMatches(text, tokens) {
  return tokens.reduce((sum, token) => {
    const matched = String(text || "").match(new RegExp(escapeRegExp(token), "gi"));
    return sum + (matched ? matched.length : 0);
  }, 0);
}

function detectSectionMarkKind({ caption = "", title = "", body = "", contentTemplate = "" }) {
  const policy = getTemplateSvgPolicy(contentTemplate);
  let bestKind = null;
  let bestScore = 0;

  Object.entries(MARK_KIND_LIBRARY).forEach(([kind, entry]) => {
    const score = scoreTokenMatches(caption, entry.tokens) * 5
      + scoreTokenMatches(title, entry.tokens) * 3
      + scoreTokenMatches(body, entry.tokens);
    if (score > bestScore) {
      bestScore = score;
      bestKind = kind;
    }
  });

  return bestKind || policy.defaultMarkKind || DEFAULT_MARK_KIND_BY_TEMPLATE[contentTemplate] || "perspective";
}

function getApprovedInfographicKinds(contentTemplate, family) {
  const policyKinds = getTemplateSvgPolicy(contentTemplate).approved_infographic_kinds || [];
  const familyKinds = getFamilyVisualSystem(family).approved_infographic_kinds || [];

  if (policyKinds.length && familyKinds.length) {
    const intersected = policyKinds.filter((kind) => familyKinds.includes(kind));
    if (intersected.length > 0) return intersected;
  }

  return unique([...policyKinds, ...familyKinds]);
}

function chooseInlineInfographicKind({ caption = "", title = "", body = "", contentTemplate = "", family = "" }) {
  const source = [caption, title, body].join(" ");
  const policy = getTemplateSvgPolicy(contentTemplate);
  const familySystem = getFamilyVisualSystem(family);
  const allowedKinds = getApprovedInfographicKinds(contentTemplate, family);

  const detected = INFOGRAPHIC_HINTS.find((entry) => entry.pattern.test(source))?.kind || null;
  if (detected && (!allowedKinds.length || allowedKinds.includes(detected))) {
    return detected;
  }
  if (allowedKinds.includes(familySystem.inline_infographic_style)) {
    return familySystem.inline_infographic_style;
  }
  if (allowedKinds.includes(TEMPLATE_INFOGRAPHIC_FALLBACKS[contentTemplate])) {
    return TEMPLATE_INFOGRAPHIC_FALLBACKS[contentTemplate];
  }

  return allowedKinds[0]
    || familySystem.inline_infographic_style
    || policy.approved_infographic_kinds?.[0]
    || "structure-breakdown";
}

function getInfoGraphicKind(args) {
  return chooseInlineInfographicKind(args);
}

function buildHeroOverlay(system, stroke, profile) {
  const accentOpacity = scaleOpacity(
    getDensityOpacity(system),
    getSceneOpacityScale(profile) * getQuietnessOpacityScale(profile)
  );
  const fillOpacity = scaleOpacity(
    getFillOpacity(system),
    getSceneOpacityScale(profile) * (profile.reading_priority === "reading-first" ? 0.9 : 1)
  );
  const heroRadius = getCornerRadius(system, true);
  const quiet = profile.scene_density === "quiet" || profile.graphic_quietness === "high";

  switch (system.svg_grammar) {
    case "editorial-schematic":
      return quiet
        ? `<path d="M148 54h188M786 54h146" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" opacity="${accentOpacity}"/>`
        : `<path d="M110 42h196M774 42h196M160 138h144" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" opacity="${accentOpacity}"/>`;
    case "ledger-wireframe":
    case "bulletin-editorial":
      return quiet
        ? `<rect x="120" y="34" width="840" height="112" rx="${heroRadius}" stroke="currentColor" stroke-width="${stroke}" opacity="${fillOpacity}"/><path d="M166 72h198M166 112h238" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" opacity="${accentOpacity}"/>`
        : `<rect x="90" y="28" width="900" height="124" rx="${heroRadius}" stroke="currentColor" stroke-width="${stroke}" opacity="${fillOpacity}"/><path d="M146 64h198M146 106h262M736 106h198" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" opacity="${accentOpacity}"/>`;
    case "archive-plate":
    case "salon-emblem":
    case "gallery-frame":
      return quiet
        ? `<rect x="138" y="28" width="804" height="124" rx="${heroRadius}" stroke="currentColor" stroke-width="${stroke}" opacity="${fillOpacity}"/>`
        : `<rect x="120" y="22" width="840" height="136" rx="${heroRadius}" stroke="currentColor" stroke-width="${stroke}" opacity="${fillOpacity}"/><rect x="160" y="44" width="264" height="92" rx="${heroRadius}" stroke="currentColor" stroke-width="${stroke}" opacity="${accentOpacity}"/>`;
    case "atlas-annotation":
    case "aurora-orbit":
      return quiet
        ? `<path d="M164 128c82-56 176-78 284-72 122 7 218-10 320-54" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" opacity="${accentOpacity}"/>`
        : `<path d="M152 132c82-58 178-84 294-78 128 6 232-14 338-66" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" opacity="${accentOpacity}"/><circle cx="858" cy="56" r="18" fill="currentColor" opacity="${fillOpacity}"/>`;
    case "signal-panel":
    case "neon-signal":
      return quiet
        ? `<path d="M112 54h856M112 126h856M274 30v120M612 30v120" stroke="currentColor" stroke-width="${stroke}" opacity="${fillOpacity}"/>`
        : `<path d="M84 40h912M84 90h912M84 140h912M220 20v140M430 20v140M640 20v140M850 20v140" stroke="currentColor" stroke-width="${stroke}" opacity="${fillOpacity}"/><circle cx="640" cy="90" r="20" fill="currentColor" opacity="${accentOpacity}"/>`;
    case "ribbon-plaque":
    case "story-ribbon":
      return quiet
        ? `<path d="M146 42h216l-28 28 28 28H146l28-28-28-28Z" fill="var(--hero-fade)" opacity=".18"/>`
        : `<path d="M126 36h248l-34 34 34 34H126l34-34-34-34Z" fill="var(--hero-fade)" opacity=".26"/><path d="M706 126h210" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" opacity="${accentOpacity}"/>`;
    case "poster-block":
      return quiet
        ? `<path d="M132 36h226v84H132z" fill="currentColor" opacity="${fillOpacity}"/>`
        : `<path d="M118 28h252v92H118z" fill="currentColor" opacity="${fillOpacity}"/><path d="M740 42h220M690 122h270" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" opacity="${accentOpacity}"/>`;
    case "play-symbolic":
      return quiet
        ? `<circle cx="214" cy="64" r="34" fill="currentColor" opacity="${fillOpacity}"/>`
        : `<circle cx="196" cy="58" r="42" fill="currentColor" opacity="${fillOpacity}"/><rect x="720" y="40" width="160" height="76" rx="${heroRadius}" fill="currentColor" opacity=".12"/>`;
    case "skyline-wire":
      return quiet
        ? `<rect x="144" y="52" width="206" height="74" rx="${heroRadius}" stroke="currentColor" stroke-width="${stroke}" opacity="${fillOpacity}"/>`
        : `<rect x="132" y="44" width="218" height="84" rx="${heroRadius}" stroke="currentColor" stroke-width="${stroke}" opacity="${fillOpacity}"/><rect x="386" y="60" width="168" height="54" rx="${heroRadius}" stroke="currentColor" stroke-width="${stroke}" opacity="${accentOpacity}"/>`;
    default:
      return "";
  }
}

function buildHeroSceneSvg(scene, family) {
  const system = getFamilyVisualSystem(family);
  const profile = getCompositionProfile(family);
  const sceneOpacityScale = getSceneOpacityScale(profile);
  const quietnessScale = getQuietnessOpacityScale(profile);
  const quiet = profile.scene_density === "quiet" || profile.graphic_quietness === "high";
  const stroke = (parseFloat(getStrokeWeightValue(system.stroke_weight, "hero")) * (quiet ? 0.92 : 1)).toFixed(2);
  const heroRadius = getCornerRadius(system, true);
  const overlay = buildHeroOverlay(system, stroke, profile);
  const sceneId = HERO_SCENE_LIBRARY[scene] ? scene : DEFAULT_VISUAL_SYSTEM.hero_scene_style;
  const baseOpacity = scaleOpacity(".2", sceneOpacityScale);
  const lineOpacity = scaleOpacity(".44", sceneOpacityScale * quietnessScale);
  const secondaryLineOpacity = scaleOpacity(".24", sceneOpacityScale * quietnessScale);
  const accentFillOpacity = scaleOpacity(".42", sceneOpacityScale * (quiet ? 0.76 : 0.98));
  const accentOrbOpacity = scaleOpacity(".16", quietnessScale);

  const scenes = {
    "editorial-beam": `<svg viewBox="0 0 1080 180" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" data-scene-template="${sceneId}" data-scene-density="${profile.scene_density}" data-svg-role="hero-scene" data-svg-grammar="${system.svg_grammar}"><defs><linearGradient id="hero-a" x1="0" y1="0" x2="1080" y2="180"><stop offset="0%" stop-color="var(--hero-grad-a)"/><stop offset="100%" stop-color="var(--hero-grad-b)"/></linearGradient></defs><rect width="1080" height="180" rx="${heroRadius}" fill="url(#hero-a)" opacity="${scaleOpacity(".22", sceneOpacityScale)}"/><path d="${quiet ? "M142 56h248M186 98h576" : "M122 48h312M654 48h224M180 92h664M120 136h260M742 136h206"}" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" opacity="${secondaryLineOpacity}"/>${quiet ? "" : `<circle cx="826" cy="96" r="76" fill="var(--hero-fade)" opacity="${scaleOpacity(".54", quietnessScale)}"/>`}${overlay}</svg>`,
    "signal-grid": `<svg viewBox="0 0 1080 180" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" data-scene-template="${sceneId}" data-scene-density="${profile.scene_density}" data-svg-role="hero-scene" data-svg-grammar="${system.svg_grammar}"><defs><linearGradient id="hero-b" x1="0" y1="0" x2="1080" y2="180"><stop offset="0%" stop-color="var(--hero-grad-a)"/><stop offset="100%" stop-color="var(--hero-grad-b)"/></linearGradient></defs><rect width="1080" height="180" rx="${heroRadius}" fill="url(#hero-b)" opacity="${scaleOpacity(".24", sceneOpacityScale)}"/><path d="${quiet ? "M148 118h176l34-28h140l48 20h136l48-42h156" : "M128 120h188l42-38h146l58 28h146l52-56h172"}" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" opacity="${lineOpacity}"/>${quiet ? "" : `<circle cx="560" cy="108" r="34" fill="var(--hero-fade)" opacity="${scaleOpacity(".44", quietnessScale)}"/>`}${overlay}</svg>`,
    "paper-fold": `<svg viewBox="0 0 1080 180" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" data-scene-template="${sceneId}" data-scene-density="${profile.scene_density}" data-svg-role="hero-scene" data-svg-grammar="${system.svg_grammar}"><defs><linearGradient id="hero-c" x1="0" y1="0" x2="1080" y2="180"><stop offset="0%" stop-color="var(--hero-grad-a)"/><stop offset="100%" stop-color="var(--hero-grad-b)"/></linearGradient></defs><rect width="1080" height="180" rx="${heroRadius}" fill="url(#hero-c)" opacity="${baseOpacity}"/><path d="${quiet ? "M136 36h808v108H136z" : "M112 34h856v112H112z"}" stroke="currentColor" stroke-width="${stroke}" opacity="${secondaryLineOpacity}"/><path d="${quiet ? "M136 36h320l-78 74H136V36Zm808 108H624l78-74h242v74Z" : "M112 34h348l-90 84H112V34Zm856 112H610l90-86h268v86Z"}" fill="var(--hero-fade)" opacity="${scaleOpacity(".3", quietnessScale)}"/>${quiet ? "" : `<path d="M460 34 370 118M610 146 700 60" stroke="currentColor" stroke-width="${stroke}" opacity="${scaleOpacity(".34", quietnessScale)}"/>`}${overlay}</svg>`,
    "constellation-map": `<svg viewBox="0 0 1080 180" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" data-scene-template="${sceneId}" data-scene-density="${profile.scene_density}" data-svg-role="hero-scene" data-svg-grammar="${system.svg_grammar}"><defs><linearGradient id="hero-d" x1="0" y1="0" x2="1080" y2="180"><stop offset="0%" stop-color="var(--hero-grad-a)"/><stop offset="100%" stop-color="var(--hero-grad-b)"/></linearGradient></defs><rect width="1080" height="180" rx="${heroRadius}" fill="url(#hero-d)" opacity="${baseOpacity}"/><path d="${quiet ? "M176 116 324 78 460 96 612 58 746 90 894 70" : "M166 118 316 74 460 100 596 52 722 90 866 62 958 118"}" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" opacity="${lineOpacity}"/>${quiet ? `<circle cx="176" cy="116" r="10" fill="currentColor" opacity="${accentOrbOpacity}"/><circle cx="746" cy="90" r="12" fill="currentColor" opacity="${accentOrbOpacity}"/>` : `<circle cx="166" cy="118" r="10" fill="currentColor" opacity=".24"/><circle cx="460" cy="100" r="12" fill="currentColor" opacity=".16"/><circle cx="722" cy="90" r="12" fill="currentColor" opacity=".16"/><circle cx="956" cy="118" r="14" fill="var(--hero-fade)" opacity=".48"/>`}${overlay}</svg>`,
    "ribbon-flow": `<svg viewBox="0 0 1080 180" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" data-scene-template="${sceneId}" data-scene-density="${profile.scene_density}" data-svg-role="hero-scene" data-svg-grammar="${system.svg_grammar}"><defs><linearGradient id="hero-e" x1="0" y1="0" x2="1080" y2="180"><stop offset="0%" stop-color="var(--hero-grad-a)"/><stop offset="100%" stop-color="var(--hero-grad-b)"/></linearGradient></defs><rect width="1080" height="180" rx="${heroRadius}" fill="url(#hero-e)" opacity="${scaleOpacity(".18", sceneOpacityScale)}"/><path d="${quiet ? "112 126c118-54 228-60 330-24 92 32 172 34 236-6 74-46 156-54 272-18" : "84 132c122-64 238-72 352-28 98 38 184 40 254-8 78-52 166-62 306-20"}" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" opacity="${lineOpacity}"/>${quiet ? "" : `<path d="M128 76c94-34 186-34 286 2 96 34 180 38 272 10 68-20 146-22 234-4" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" opacity="${secondaryLineOpacity}"/><rect x="694" y="34" width="160" height="74" rx="${heroRadius}" fill="var(--hero-fade)" opacity="${scaleOpacity(".32", quietnessScale)}"/>`}${overlay}</svg>`,
    "museum-frame": `<svg viewBox="0 0 1080 180" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" data-scene-template="${sceneId}" data-scene-density="${profile.scene_density}" data-svg-role="hero-scene" data-svg-grammar="${system.svg_grammar}"><defs><linearGradient id="hero-f" x1="0" y1="0" x2="1080" y2="180"><stop offset="0%" stop-color="var(--hero-grad-a)"/><stop offset="100%" stop-color="var(--hero-grad-b)"/></linearGradient></defs><rect width="1080" height="180" rx="${heroRadius}" fill="url(#hero-f)" opacity="${scaleOpacity(".18", sceneOpacityScale)}"/><rect x="${quiet ? "134" : "116"}" y="${quiet ? "28" : "24"}" width="${quiet ? "812" : "848"}" height="${quiet ? "124" : "132"}" rx="${heroRadius}" stroke="currentColor" stroke-width="${stroke}" opacity="${scaleOpacity(".18", quietnessScale)}"/>${quiet ? `<path d="M610 72h214M610 104h176" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" opacity="${secondaryLineOpacity}"/>` : `<path d="M592 66h246M592 96h194M592 126h270" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" opacity="${scaleOpacity(".28", quietnessScale)}"/><circle cx="354" cy="92" r="72" fill="var(--hero-fade)" opacity="${accentFillOpacity}"/>`}${overlay}</svg>`,
  };

  return scenes[sceneId] || scenes["editorial-beam"];
}

function buildInfographicShell(system, stroke, fillOpacity) {
  const frameRadius = getCornerRadius(system, true);
  const accentOpacity = getDensityOpacity(system);

  switch (system.svg_grammar) {
    case "editorial-schematic":
      return {
        before: `<path d="M14 20h44M164 20h42" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" opacity="${accentOpacity}"/>`,
        after: "",
      };
    case "ledger-wireframe":
    case "bulletin-editorial":
      return {
        before: `<rect x="12" y="12" width="196" height="60" rx="${frameRadius}" stroke="currentColor" stroke-width="${stroke}" opacity="${fillOpacity}"/>`,
        after: "",
      };
    case "archive-plate":
    case "salon-emblem":
    case "gallery-frame":
      return {
        before: `<rect x="10" y="10" width="200" height="64" rx="${frameRadius}" stroke="currentColor" stroke-width="${stroke}" opacity="${fillOpacity}"/>`,
        after: `<rect x="22" y="22" width="176" height="40" rx="${frameRadius}" stroke="currentColor" stroke-width="${stroke}" opacity="${accentOpacity}"/>`,
      };
    case "atlas-annotation":
    case "aurora-orbit":
      return {
        before: `<path d="M18 66c36-28 72-40 110-34 26 4 50-4 74-24" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" opacity="${accentOpacity}"/>`,
        after: "",
      };
    case "signal-panel":
    case "neon-signal":
    case "skyline-wire":
      return {
        before: `<path d="M12 16h196M12 42h196M12 68h196" stroke="currentColor" stroke-width="${stroke}" opacity="${fillOpacity}"/>`,
        after: "",
      };
    case "ribbon-plaque":
    case "story-ribbon":
      return {
        before: `<path d="M18 16h50l-8 8 8 8H18l8-8-8-8Z" fill="currentColor" opacity="${fillOpacity}"/>`,
        after: "",
      };
    case "poster-block":
      return {
        before: `<rect x="12" y="14" width="52" height="20" rx="4" fill="currentColor" opacity="${fillOpacity}"/>`,
        after: "",
      };
    case "play-symbolic":
      return {
        before: `<circle cx="28" cy="24" r="10" fill="currentColor" opacity="${fillOpacity}"/><circle cx="194" cy="60" r="8" fill="currentColor" opacity="${fillOpacity}"/>`,
        after: "",
      };
    default:
      return { before: "", after: "" };
  }
}

function buildInlineInfographicSvg(kind, family) {
  const system = getFamilyVisualSystem(family);
  const profile = getCompositionProfile(family);
  const stroke = getStrokeWeightValue(system.stroke_weight, "infographic");
  const fillOpacity = scaleOpacity(getFillOpacity(system), getQuietnessOpacityScale(profile));
  const shell = buildInfographicShell(system, stroke, fillOpacity);

  const templates = {
    "process-track": `<path d="M20 42h44l18-18h52l18 18h48" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/><circle cx="20" cy="42" r="8" fill="currentColor" opacity=".18"/><circle cx="82" cy="24" r="8" fill="currentColor" opacity=".18"/><circle cx="152" cy="42" r="8" fill="currentColor" opacity=".18"/><circle cx="200" cy="42" r="8" fill="currentColor" opacity=".18"/>`,
    "node-network": `<circle cx="34" cy="42" r="10" stroke="currentColor" stroke-width="${stroke}"/><circle cx="98" cy="24" r="9" stroke="currentColor" stroke-width="${stroke}"/><circle cx="98" cy="60" r="9" stroke="currentColor" stroke-width="${stroke}"/><circle cx="182" cy="42" r="12" fill="currentColor" opacity=".12"/><path d="M44 39 89 27M44 45l45 12M107 24h58M107 60h58" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round"/>`,
    "compare-grid": `<rect x="20" y="18" width="72" height="48" rx="16" stroke="currentColor" stroke-width="${stroke}"/><rect x="128" y="18" width="72" height="48" rx="16" fill="currentColor" opacity=".12"/><path d="M52 34h16M52 48h26M154 34h16M154 48h26" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round"/>`,
    "path-map": `<path d="M26 58c28-24 58-34 88-28 28 6 48 0 78-28" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round"/><circle cx="26" cy="58" r="9" fill="currentColor" opacity=".14"/><circle cx="112" cy="30" r="10" stroke="currentColor" stroke-width="${stroke}"/><circle cx="192" cy="30" r="9" fill="currentColor" opacity=".22"/>`,
    "evidence-stack": `<rect x="26" y="16" width="96" height="18" rx="9" stroke="currentColor" stroke-width="${stroke}"/><rect x="42" y="34" width="118" height="18" rx="9" fill="currentColor" opacity=".12"/><rect x="58" y="52" width="136" height="18" rx="9" stroke="currentColor" stroke-width="${stroke}"/><path d="M56 25h34M70 61h46" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round"/>`,
    "structure-breakdown": `<rect x="18" y="18" width="58" height="48" rx="18" stroke="currentColor" stroke-width="${stroke}"/><rect x="96" y="18" width="44" height="20" rx="10" stroke="currentColor" stroke-width="${stroke}"/><rect x="96" y="46" width="44" height="20" rx="10" fill="currentColor" opacity=".12"/><rect x="160" y="18" width="42" height="48" rx="18" stroke="currentColor" stroke-width="${stroke}"/><path d="M76 42h18M140 28h20M140 56h20" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round"/>`,
  };

  const templateId = INLINE_INFOGRAPHIC_LIBRARY[kind] ? kind : "structure-breakdown";
  return `<svg viewBox="0 0 220 84" fill="none" aria-hidden="true" data-infographic-template="${templateId}" data-reading-priority="${profile.reading_priority}" data-svg-role="inline-infographic" data-svg-grammar="${system.svg_grammar}">${shell.before}${templates[templateId]}${shell.after}</svg>`;
}

function getDividerVariantForFamily(family) {
  return getFamilyVisualSystem(family).divider_style || DEFAULT_VISUAL_SYSTEM.divider_style;
}

module.exports = {
  DEFAULT_MARK_KIND_BY_TEMPLATE,
  MARK_KIND_LIBRARY,
  HERO_SCENE_LIBRARY,
  INLINE_INFOGRAPHIC_LIBRARY,
  SVG_COMPOSITION_ROLE_RULES,
  TEMPLATE_SCENE_FALLBACKS,
  TEMPLATE_INFOGRAPHIC_FALLBACKS,
  getTemplateSvgPolicy,
  getFamilyVisualSystem,
  getCompositionProfile,
  getCompositionDecision,
  getRolePlacementRule,
  getHeroNodeBudget,
  getInlineInfographicNodeBudget,
  chooseHeroScene,
  detectSectionMarkKind,
  createMarkSvg,
  chooseInlineInfographicKind,
  getApprovedInfographicKinds,
  getInfoGraphicKind,
  buildHeroSceneSvg,
  buildInlineInfographicSvg,
  getDividerVariantForFamily,
};
