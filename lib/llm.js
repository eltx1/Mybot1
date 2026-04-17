import fetch from "node-fetch";

function parseBooleanFlag(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
}

function getLlmRuntimeConfig() {
  const useOllama = parseBooleanFlag(process.env.USE_OLLAMA, true);
  return {
    useOllama,
    provider: useOllama ? "ollama" : "openai",
    ollamaBaseUrl: (process.env.OLLAMA_BASE_URL || "http://localhost:11434").replace(/\/$/, ""),
    ollamaModel: process.env.OLLAMA_MODEL || "qwen3.5:2b",
    openAiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
    hasOpenAiKey: Boolean(process.env.OPENAI_API_KEY || process.env.OPENAI_KEY)
  };
}

function buildTransportErrorMessage(provider, reason, details = "") {
  const suffix = details ? ` (${details})` : "";
  return `${provider.toUpperCase()} ${reason}${suffix}`;
}

async function callLLM({
  systemPrompt,
  userPrompt,
  temperature = 0.2,
  topP = 1,
  model,
  logger = console,
  requestId = null,
  metadata = {}
}) {
  const config = getLlmRuntimeConfig();
  const safeTemperature = Number.isFinite(Number(temperature)) ? Number(temperature) : 0.2;
  const safeTopP = Number.isFinite(Number(topP)) ? Number(topP) : 1;

  if (config.useOllama) {
    const resolvedModel = model || config.ollamaModel;
    const endpoint = `${config.ollamaBaseUrl}/api/chat`;
    const body = {
      model: resolvedModel,
      stream: false,
      options: {
        temperature: safeTemperature,
        top_p: safeTopP
      },
      messages: [
        { role: "system", content: String(systemPrompt || "") },
        { role: "user", content: String(userPrompt || "") }
      ]
    };

    logger.log?.("[LLM] Dispatching Ollama request", {
      requestId,
      provider: "ollama",
      endpoint,
      model: resolvedModel,
      temperature: safeTemperature,
      topP: safeTopP,
      ...metadata
    });

    let response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
    } catch (err) {
      const details = err?.message || "network failure";
      const message = buildTransportErrorMessage("ollama", "connection failed", details);
      logger.error?.("[LLM] Ollama connection failed", { requestId, endpoint, error: details, ...metadata });
      const wrapped = new Error(message);
      wrapped.code = "OLLAMA_CONNECTION_FAILED";
      throw wrapped;
    }

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error?.("[LLM] Ollama request failed", {
        requestId,
        endpoint,
        status: response.status,
        error: errorBody.slice(0, 800),
        ...metadata
      });
      const wrapped = new Error(buildTransportErrorMessage("ollama", "request failed", `HTTP ${response.status}`));
      wrapped.code = "OLLAMA_REQUEST_FAILED";
      wrapped.status = response.status;
      wrapped.details = errorBody;
      throw wrapped;
    }

    const payload = await response.json();
    const text = typeof payload?.message?.content === "string" ? payload.message.content : "";
    if (!text.trim()) {
      logger.error?.("[LLM] Ollama payload missing message.content", { requestId, payload, ...metadata });
      const wrapped = new Error("OLLAMA response did not include message.content");
      wrapped.code = "OLLAMA_EMPTY_RESPONSE";
      throw wrapped;
    }

    return {
      provider: "ollama",
      model: resolvedModel,
      text,
      raw: payload
    };
  }

  const key = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
  if (!key) {
    const wrapped = new Error("OPENAI_API_KEY is required when USE_OLLAMA=false");
    wrapped.code = "OPENAI_KEY_MISSING";
    throw wrapped;
  }

  const resolvedModel = model || config.openAiModel;
  const endpoint = "https://api.openai.com/v1/chat/completions";
  logger.log?.("[LLM] Dispatching OpenAI request", {
    requestId,
    provider: "openai",
    endpoint,
    model: resolvedModel,
    temperature: safeTemperature,
    topP: safeTopP,
    ...metadata
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: resolvedModel,
      temperature: safeTemperature,
      top_p: safeTopP,
      messages: [
        { role: "system", content: String(systemPrompt || "") },
        { role: "user", content: String(userPrompt || "") }
      ]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    const wrapped = new Error(buildTransportErrorMessage("openai", "request failed", `HTTP ${response.status}`));
    wrapped.code = "OPENAI_REQUEST_FAILED";
    wrapped.status = response.status;
    wrapped.details = errText;
    throw wrapped;
  }

  const payload = await response.json();
  const text = payload?.choices?.[0]?.message?.content || "";
  if (!text.trim()) {
    const wrapped = new Error("OPENAI response was empty");
    wrapped.code = "OPENAI_EMPTY_RESPONSE";
    throw wrapped;
  }

  return {
    provider: "openai",
    model: resolvedModel,
    text,
    raw: payload
  };
}

export {
  callLLM,
  getLlmRuntimeConfig
};
