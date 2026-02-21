const htmlInput = document.getElementById("htmlInput");
const cssInput = document.getElementById("cssInput");
const jsInput = document.getElementById("jsInput");
const aiPromptInput = document.getElementById("aiPrompt");
const statusEl = document.getElementById("status");
const endpointInput = document.getElementById("endpointInput");
const apiKeyInput = document.getElementById("apiKeyInput");
const modelInput = document.getElementById("modelInput");

const applyBtn = document.getElementById("applyBtn");
const resetBtn = document.getElementById("resetBtn");
const generateBtn = document.getElementById("generateBtn");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");

async function getActiveTabId() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs.length) {
    throw new Error("Brak aktywnej karty.");
  }
  return tabs[0].id;
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

async function sendToTab(type, payload) {
  const tabId = await getActiveTabId();
  return chrome.tabs.sendMessage(tabId, { type, payload });
}

async function hydrateFromTab() {
  try {
    const response = await sendToTab("OLF_GET_STATE");
    if (response?.ok) {
      htmlInput.value = response.state.html || "";
      cssInput.value = response.state.css || "";
      jsInput.value = response.state.js || "";
      setStatus("Załadowano stan strony.");
      return;
    }
    setStatus("Nie udało się odczytać stanu.", true);
  } catch (error) {
    setStatus(`Błąd połączenia z kartą: ${String(error)}`, true);
  }
}

async function applyPatch(patch) {
  const response = await sendToTab("OLF_APPLY", patch);
  if (!response?.ok) {
    throw new Error(response?.error || "Nieznany błąd apply.");
  }
  htmlInput.value = response.state.html || "";
  cssInput.value = response.state.css || "";
  jsInput.value = response.state.js || "";
}

applyBtn.addEventListener("click", async () => {
  try {
    await applyPatch({
      html: htmlInput.value,
      css: cssInput.value,
      js: jsInput.value
    });
    setStatus("Zastosowano zmiany na stronie.");
  } catch (error) {
    setStatus(String(error), true);
  }
});

resetBtn.addEventListener("click", async () => {
  try {
    await sendToTab("OLF_RESET");
    htmlInput.value = "";
    cssInput.value = "";
    jsInput.value = "";
    setStatus("Wyczyszczono modyfikacje.");
  } catch (error) {
    setStatus(String(error), true);
  }
});

saveSettingsBtn.addEventListener("click", async () => {
  await chrome.storage.local.set({
    olf_endpoint: endpointInput.value.trim(),
    olf_apiKey: apiKeyInput.value.trim(),
    olf_model: modelInput.value.trim()
  });
  setStatus("Zapisano ustawienia AI.");
});

generateBtn.addEventListener("click", async () => {
  const prompt = aiPromptInput.value.trim();
  if (!prompt) {
    setStatus("Wpisz prompt dla AI.", true);
    return;
  }

  setStatus("Generowanie...", false);
  generateBtn.disabled = true;

  try {
    const storage = await chrome.storage.local.get(["olf_endpoint", "olf_apiKey", "olf_model"]);

    const result = await chrome.runtime.sendMessage({
      type: "OLF_AI_GENERATE",
      payload: {
        prompt,
        currentState: {
          html: htmlInput.value,
          css: cssInput.value,
          js: jsInput.value
        },
        endpoint: storage.olf_endpoint,
        apiKey: storage.olf_apiKey,
        model: storage.olf_model
      }
    });

    if (!result?.ok) {
      throw new Error(result?.error || "Błąd generacji.");
    }

    await applyPatch(result.patch);
    setStatus(result.explanation || "Wygenerowano i zastosowano patch.");
  } catch (error) {
    setStatus(String(error), true);
  } finally {
    generateBtn.disabled = false;
  }
});

(async function init() {
  const storage = await chrome.storage.local.get(["olf_endpoint", "olf_apiKey", "olf_model"]);
  endpointInput.value = storage.olf_endpoint || "https://api.openai.com/v1/chat/completions";
  apiKeyInput.value = storage.olf_apiKey || "";
  modelInput.value = storage.olf_model || "gpt-4o-mini";
  await hydrateFromTab();
})();
