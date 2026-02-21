const STATE = {
  styleEl: null,
  sandboxRoot: null,
  scriptDisposers: [],
  current: {
    css: "",
    html: "",
    js: ""
  }
};

function ensureStyleElement() {
  if (STATE.styleEl && document.contains(STATE.styleEl)) {
    return STATE.styleEl;
  }
  const style = document.createElement("style");
  style.setAttribute("data-organic-live-forge", "css");
  document.documentElement.appendChild(style);
  STATE.styleEl = style;
  return style;
}

function ensureSandboxRoot() {
  if (STATE.sandboxRoot && document.contains(STATE.sandboxRoot)) {
    return STATE.sandboxRoot;
  }
  const root = document.createElement("div");
  root.setAttribute("data-organic-live-forge", "html");
  root.style.all = "initial";
  root.style.position = "relative";
  root.style.display = "contents";
  document.body.appendChild(root);
  STATE.sandboxRoot = root;
  return root;
}

function runJavaScript(code) {
  for (const dispose of STATE.scriptDisposers) {
    try {
      dispose();
    } catch (_) {
      // no-op cleanup
    }
  }
  STATE.scriptDisposers = [];

  if (!code || !code.trim()) {
    return { ok: true };
  }

  const api = {
    appendToBody(node) {
      if (node instanceof Element) {
        document.body.appendChild(node);
      }
    },
    onCleanup(fn) {
      if (typeof fn === "function") {
        STATE.scriptDisposers.push(fn);
      }
    }
  };

  try {
    const runner = new Function(
      "window",
      "document",
      "api",
      `'use strict';\n${code}`
    );
    runner(window, document, api);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: String(error)
    };
  }
}

function applyPatch(payload) {
  const next = {
    css: payload.css ?? STATE.current.css,
    html: payload.html ?? STATE.current.html,
    js: payload.js ?? STATE.current.js
  };

  if (typeof next.css === "string") {
    ensureStyleElement().textContent = next.css;
  }

  if (typeof next.html === "string") {
    const root = ensureSandboxRoot();
    root.innerHTML = next.html;
  }

  let scriptResult = { ok: true };
  if (typeof next.js === "string") {
    scriptResult = runJavaScript(next.js);
  }

  if (!scriptResult.ok) {
    return {
      ok: false,
      error: scriptResult.error
    };
  }

  STATE.current = next;
  return {
    ok: true,
    state: STATE.current
  };
}

function resetPatch() {
  if (STATE.styleEl) {
    STATE.styleEl.textContent = "";
  }
  if (STATE.sandboxRoot) {
    STATE.sandboxRoot.innerHTML = "";
  }
  runJavaScript("");
  STATE.current = { css: "", html: "", js: "" };
  return { ok: true, state: STATE.current };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || !message.type) {
    return;
  }

  if (message.type === "OLF_APPLY") {
    sendResponse(applyPatch(message.payload || {}));
  }

  if (message.type === "OLF_RESET") {
    sendResponse(resetPatch());
  }

  if (message.type === "OLF_GET_STATE") {
    sendResponse({ ok: true, state: STATE.current });
  }
});
