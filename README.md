# Organic Live Forge (Chrome Extension)

Wtyczka do szybkiego, lokalnego prototypowania UI i zachowania strony bez przebudowy projektu.

## Co robi

- Modyfikuje **HTML, CSS i JavaScript** na aktualnie otwartej karcie.
- Działa w trybie **live**: kliknięcie „Zastosuj” od razu pokazuje efekt na stronie.
- Ma pole „Prompt AI”, które generuje patch (`html`, `css`, `js`) i automatycznie go aplikuje.
- Pozwala wyczyścić zmiany przyciskiem „Reset”.

## Jak to działa (architektura)

### 1) `content_script` – silnik zmian na stronie

Plik: `content/content-script.js`

- Utrzymuje stan patcha (`css`, `html`, `js`) per karta.
- Wstrzykuje:
  - `<style data-organic-live-forge="css">` do `documentElement` dla CSS,
  - kontener `<div data-organic-live-forge="html">` do `body` dla HTML.
- Uruchamia kod JS przez `new Function(...)` i wspiera cleanup (API `onCleanup`).

### 2) Popup – minimalistyczne „organic UI”

Pliki: `popup/popup.html`, `popup/popup.css`, `popup/popup.js`

- Ciemny, miękki interfejs z zielonym akcentem i zaokrągleniami.
- Sekcje:
  - Prompt AI,
  - ręczne pola HTML/CSS/JS,
  - przyciski „Zastosuj”/„Reset”,
  - ustawienia API (endpoint, model, key).
- Komunikuje się z aktywną kartą przez `chrome.tabs.sendMessage`.

### 3) Service Worker – integracja AI

Plik: `background/service-worker.js`

- Odbiera żądanie `OLF_AI_GENERATE` z popupu.
- Wysyła request do endpointu OpenAI-compatible `/chat/completions`.
- Wymusza zwrot czystego JSON z kluczami:
  - `html`, `css`, `js`, `explanation`.
- Zwraca gotowy patch do popupu, który aplikuje go na stronie.

## Minimalistyczny design UI (założenia)

- **Organic, low-friction**: jedna kolumna, krótkie ścieżki, minimum kliknięć.
- **Natychmiastowy feedback**: status pod przyciskami.
- **Dual mode**:
  1. ręczna edycja (dev kontroluje kod),
  2. AI prompt (szybki prototyp).
- **Bez lock-in**: endpoint i model konfigurowalne.

## Wymagania techniczne

- Chrome (Manifest V3).
- Uprawnienia:
  - `activeTab`, `scripting`, `storage`,
  - `host_permissions: <all_urls>`.
- Dla funkcji AI: API key i endpoint kompatybilny z OpenAI chat completions.

## Instalacja lokalna

1. Otwórz `chrome://extensions/`
2. Włącz „Developer mode”.
3. Kliknij „Load unpacked”.
4. Wskaż katalog repo (`/workspace/codex_repo`).

## Użycie

1. Wejdź na swoją stronę deweloperską.
2. Otwórz popup „Organic Live Forge”.
3. Wklej ręcznie HTML/CSS/JS i kliknij **Zastosuj** – albo wpisz prompt i kliknij **Generuj i zastosuj**.
4. Gdy skończysz eksperyment, kliknij **Reset**.

## Bezpieczeństwo i ograniczenia

- Kod JS uruchamiany przez wtyczkę wykonuje się na stronie – używaj tylko zaufanych promptów i źródeł.
- Strony z restrykcyjnym CSP lub specyficzną strukturą DOM mogą wymagać dostosowania.
- To narzędzie do szybkiego prototypowania; nie zastępuje review i commitów w repo aplikacji docelowej.
