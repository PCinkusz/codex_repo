const DEFAULT_MODEL = "gpt-4o-mini";

async function callAiProvider(input) {
  const {
    prompt,
    currentState,
    endpoint,
    apiKey,
    model = DEFAULT_MODEL
  } = input;

  if (!endpoint || !apiKey) {
    return { ok: false, error: "Uzupełnij endpoint i klucz API w ustawieniach." };
  }

  const systemPrompt = `You are a senior front-end assistant. Return only JSON with keys: html, css, js, explanation.
Rules:
- html: snippet to inject into page container.
- css: styles for the snippet and page-level tweaks if needed.
- js: optional enhancement code. Should be safe and small.
- explanation: one short sentence in Polish.
No markdown, no code fences.`;

  const userPrompt = `Aktualny stan:
HTML:\n${currentState.html || ""}\n
CSS:\n${currentState.css || ""}\n
JS:\n${currentState.js || ""}\n
Polecenie użytkownika:\n${prompt}`;

  try {
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
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const text = await response.text();
      return { ok: false, error: `Błąd API: ${response.status} ${text}` };
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      return { ok: false, error: "Model nie zwrócił treści." };
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (_error) {
      const maybeJson = content.match(/\{[\s\S]*\}/);
      if (!maybeJson) {
        return { ok: false, error: "Nie udało się sparsować JSON z odpowiedzi modelu." };
      }
      parsed = JSON.parse(maybeJson[0]);
    }

    return {
      ok: true,
      patch: {
        html: parsed.html || "",
        css: parsed.css || "",
        js: parsed.js || ""
      },
      explanation: parsed.explanation || "Wygenerowano modyfikację."
    };
  } catch (error) {
    return {
      ok: false,
      error: `Błąd połączenia: ${String(error)}`
    };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "OLF_AI_GENERATE") {
    callAiProvider(message.payload).then(sendResponse);
    return true;
  }
});
