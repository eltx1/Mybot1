const PROMPT_TYPES = {
  AI_ROLE: "ai_role_generation",
  AI_FEEDBACK: "ai_feedback_review",
  DEMO_AI_RULE: "demo_ai_rule_generation"
};

const PROMPT_DEFAULTS = [
  {
    key: "ai-role",
    name: "AI Live Rule Generation",
    usage: PROMPT_TYPES.AI_ROLE,
    systemPrompt: "You are an elite crypto trading analyst with live data access. Conduct up-to-date market research before responding. Think step-by-step privately and return only the JSON result requested.",
    userPromptTemplate: [
      "You have {{budget}} USDT to allocate to a single Binance spot trade that should complete within 24 hours.",
      "Use the following live market snapshot (JSON) as your primary data source:",
      "{{snapshotText}}",
      "Before finalizing the trade idea you MUST research the latest public crypto headlines online and factor any breaking news into your reasoning.",
      "Respond ONLY with minified JSON using this schema: {\"symbol\":\"PAIR\",\"entryPrice\":number,\"exitPrice\":number,\"summary\":\"...\"}.",
      "Rules:",
      "1. Choose a symbol from the snapshot with healthy liquidity.",
      "2. entryPrice must stay within 3% of the snapshot lastPrice and represent a realistic limit maker entry.",
      "3. exitPrice must be higher than entryPrice by 0.5% - 5% unless news justifies a different range.",
      "4. Target a quick setup that can realistically fill and close within 24 hours based on liquidity and recent volatility.",
      "5. Account for Binance trading fees on both entry and exit so the net result remains profitable after fees.",
      "6. Mention the supporting data and news you considered inside the summary and write it in {{summaryLanguage}}."
    ].join("\n"),
    variables: ["budget", "snapshotText", "summaryLanguage"],
    settings: { temperature: 0.3 }
  },
  {
    key: "ai-feedback",
    name: "AI Rule Feedback Review",
    usage: PROMPT_TYPES.AI_FEEDBACK,
    systemPrompt: [
      "You are a senior quantitative crypto trading coach.",
      "You will receive automated rule performance metrics and current market context.",
      "Analyse the data and propose concrete actions to keep, adjust, pause, or retire rules.",
      "For each rule give short notes and optional numeric adjustments.",
      "Return a JSON object with this schema:",
      '{"updates":[{"ruleId":"...","action":"keep|adjust|pause|retire","confidence":0-1,"priority":0-1,"notes":"...","adjustments":{"entryPrice":number?,"exitPrice":number?,"budgetUSDT":number?}}],"globalInsights":"...","sentimentSummary":"...","nextSteps":["..."]}',
      "Focus on the provided performance data. Do not hallucinate symbols that are not listed.",
      "If data is insufficient, flag the rule for manual review instead of guessing."
    ].join("\n"),
    userPromptTemplate: [
      "Use the following account + rules + market JSON payload:",
      "{{aiInputJson}}",
      "Respond with JSON only."
    ].join("\n"),
    variables: ["aiInputJson"],
    settings: { temperature: 0.2, response_format: { type: "json_object" } }
  },
  {
    key: "demo-ai-rule",
    name: "Demo AI Rule Generation",
    usage: PROMPT_TYPES.DEMO_AI_RULE,
    systemPrompt: "You are an expert crypto analyst building educational demo trades. Think through the data silently then respond only with the requested JSON.",
    userPromptTemplate: [
      "You are simulating a paper trading setup using CoinGecko USD spot prices.",
      "Choose one asset from the provided snapshot array and design a single trade.",
      "Return ONLY minified JSON using this schema: {\"assetId\":\"coingecko-id\",\"assetSymbol\":\"SYMBOL\",\"entryPriceUSD\":number,\"takeProfitPct\":number,\"stopLossPct\":number,\"summary\":\"...\"}.",
      "Requirements:",
      "1. entryPriceUSD must be within 1% below or above the current price and represent a realistic limit order.",
      "2. takeProfitPct must be between 0.5 and 5.",
      "3. stopLossPct must be between 0.5 and 5.",
      "4. Write the summary in {{summaryLanguage}} and reference concrete metrics from the snapshot.",
      "SNAPSHOT:",
      "{{snapshotText}}",
      "BUDGET: {{budgetUSD}} USD"
    ].join("\n"),
    variables: ["summaryLanguage", "snapshotText", "budgetUSD"],
    settings: { temperature: 0.2 }
  }
];

function renderTemplate(template, values = {}) {
  return String(template || "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const value = values[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

function defaultPromptMap() {
  return PROMPT_DEFAULTS.reduce((acc, item) => {
    acc[item.key] = { ...item };
    return acc;
  }, {});
}

export {
  PROMPT_DEFAULTS,
  PROMPT_TYPES,
  renderTemplate,
  defaultPromptMap
};
