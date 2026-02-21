# Organic Live Forge (Chrome Extension)

Wtyczka do szybkiego, lokalnego prototypowania UI na stronie: **AI pisze HTML/CSS/JS za Ciebie i od razu aplikuje efekt**.

## Dlaczego to jest szybkie

- Nie przebudowujesz projektu.
- Nie robisz deploya.
- Nie przełączasz się między narzędziami.
- Prompt → kod → widoczny efekt na otwartej stronie.

## Najważniejsze: AI jako domyślna ścieżka

Masz dwa tryby AI:

1. **OpenRouter (free modele)**
   - Domyślny endpoint: `https://openrouter.ai/api/v1/chat/completions`
   - Domyślny model: `meta-llama/llama-3.1-8b-instruct:free`
   - Wymaga API key (wklejany w popupie).

2. **Ollama local (bez API key)**
   - Domyślny endpoint: `http://127.0.0.1:11434/api/chat`
   - Domyślny model: `qwen2.5-coder:7b`
   - Działa lokalnie, jeśli masz uruchomioną Ollama.

## Jak działa architektura

### 1) Content script (`content/content-script.js`)

- Trzyma stan patcha (`html`, `css`, `js`) na karcie.
- Wstrzykuje CSS do `<style data-organic-live-forge="css">`.
- Wstrzykuje HTML do kontenera `<div data-organic-live-forge="html">`.
- Uruchamia JS i wspiera cleanup między kolejnymi patchami.

### 2) Popup UI (`popup/*`)

- Pole promptu AI + gotowe szybkie „chipsy” promptów.
- Edytory HTML/CSS/JS (na wypadek ręcznej korekty).
- Przyciski:
  - **Generuj i zastosuj** (najważniejszy workflow),
  - **Zastosuj ręcznie**,
  - **Reset**.
- Ustawienia AI:
  - wybór providera,
  - endpoint,
  - model,
  - API key.

### 3) Service worker (`background/service-worker.js`)

- Obsługuje generację AI przez `OLF_AI_GENERATE`.
- Ma adapter dla OpenAI-compatible endpointów i osobny adapter dla Ollama.
- Wymusza odpowiedź modelu jako JSON: `html`, `css`, `js`, `explanation`.

## Instalacja

1. Wejdź na `chrome://extensions/`
2. Włącz „Developer mode”.
3. Kliknij „Load unpacked”.
4. Wskaż folder repo.

## Użycie (zalecane)

1. Otwórz swoją stronę deweloperską.
2. Otwórz popup rozszerzenia.
3. W sekcji AI wybierz provider (OpenRouter lub Ollama).
4. Wpisz prompt.
5. Kliknij **Generuj i zastosuj**.
6. Jeśli efekt jest prawie dobry, popraw drobiazgi ręcznie i kliknij **Zastosuj ręcznie**.

## Bezpieczeństwo / ograniczenia

- AI generuje i uruchamia JS na stronie — używaj zaufanych promptów.
- To narzędzie do prototypowania i szybkich iteracji, nie zastępuje docelowego review kodu.
