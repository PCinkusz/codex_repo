const DEFAULTS = {
  provider: "openrouter",
  endpoint: "https://openrouter.ai/api/v1/chat/completions",
  model: "meta-llama/llama-3.1-8b-instruct:free"
};

function buildPrompts({ prompt, currentState }) {
  const systemPrompt = `You generate live frontend patches. Reply with JSON only: {"html":"...","css":"...","js":"...","explanation":"..."}.
Rules:
- html: snippet to inject into extension container.
- css: style changes for snippet/page.
- js: optional, safe browser code. Avoid external scripts.
- explanation: short Polish sentence.
No markdown. No code fences.`;

  const userPrompt = `Aktualny stan modyfikacji:\nHTML:\n${currentState?.html || ""}\n\nCSS:\n${currentState?.css || ""}\n\nJS:\n${currentState?.js || ""}\n\nPolecenie:\n${prompt}`;

  return { systemPrompt, userPrompt };
}

function parsePatchFromText(rawText) {
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (_error) {
    const maybeJson = rawText.match(/\{[\s\S]*\}/);
    if (!maybeJson) {
      throw new Error("Model nie zwrócił poprawnego JSON.");
    }
    parsed = JSON.parse(maybeJson[0]);
  }

  return {
    html: typeof parsed.html === "string" ? parsed.html : "",
    css: typeof parsed.css === "string" ? parsed.css : "",
    js: typeof parsed.js === "string" ? parsed.js : "",
    explanation: typeof parsed.explanation === "string" ? parsed.explanation : "Wygenerowano patch."
  };
}

async function callOpenAiCompatible({ endpoint, apiKey, model, systemPrompt, userPrompt }) {
  if (!apiKey) {
    return { ok: false, error: "Dla tego providera wymagany jest API key." };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    throw new Error(`Błąd API: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Brak treści w odpowiedzi modelu.");
  }

  return { ok: true, rawText: content };
}

async function callOllama({ endpoint, model, systemPrompt, userPrompt }) {
  const chatEndpoint = endpoint || "http://127.0.0.1:11434/api/chat";
  const response = await fetch(chatEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model || "qwen2.5-coder:7b",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      stream: false,
      options: {
        temperature: 0.2
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Błąd Ollama: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const content = data?.message?.content;
  if (!content) {
    throw new Error("Brak treści z Ollama.");
  }

  return { ok: true, rawText: content };
}

async function generatePatch(input) {
  const provider = input.provider || DEFAULTS.provider;
  const endpoint = (input.endpoint || DEFAULTS.endpoint).trim();
  const model = (input.model || DEFAULTS.model).trim();
  const apiKey = (input.apiKey || "").trim();
  const { systemPrompt, userPrompt } = buildPrompts(input);

  try {
    let result;
    if (provider === "ollama") {
      result = await callOllama({ endpoint, model, systemPrompt, userPrompt });
    } else {
      result = await callOpenAiCompatible({ endpoint, apiKey, model, systemPrompt, userPrompt });
    }

    const patch = parsePatchFromText(result.rawText);
    return {
      ok: true,
      patch: {
        html: patch.html,
        css: patch.css,
        js: patch.js
      },
      explanation: patch.explanation
    };
  } catch (error) {
    return {
      ok: false,
      error: `AI error: ${String(error.message || error)}`
    };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "OLF_AI_GENERATE") {
    generatePatch(message.payload || {}).then(sendResponse);
    return true;
  }
});
