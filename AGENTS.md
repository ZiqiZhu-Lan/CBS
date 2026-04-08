# AGENTS.md — SILENCE / 01 (Custom Background Sound)

## Project Overview

**SILENCE / 01** is an immersive ambient soundscape web app. Users mix 8 nature audio tracks (Rain, Cricket, Waves, Thunder, Fire, Wind, Birds, Woodcrack), control volumes independently, set focus timers, and save personal presets. The visual identity is extreme minimalism: near-black backgrounds, white typography, monospace numerics, and hardware-accelerated motion.

Live: https://ziqizhu-lan.github.io/CBS
Repo: https://github.com/ZiqiZhu-Lan/CBS
Branch model: `main` (production) / `feature-update` (active dev)

---

## Tech Stack (exact versions)

| Layer | Library | Version |
|---|---|---|
| Framework | React | ^19.2.4 |
| Language | TypeScript | ^5.9.3 |
| State | Zustand | ^5.0.11 |
| Audio | Howler.js | ^2.2.4 |
| Animation | Framer Motion | ^11.18.2 |
| Icons | React Icons | ^4.12.0 |
| Crypto | Crypto-JS (SHA256) | ^4.2.0 |
| Build | react-scripts (CRA) | 5.0.1 |
| Deploy | gh-pages | ^6.3.0 |

> **Note:** `react-scripts` 5.0.1 declares a peer dep on TypeScript `^3.2.1 || ^4`, but TypeScript 5 works in practice. This is a known CRA limitation (CRA is no longer maintained).

Commands:
- `npm start` — dev server at localhost:3000
- `npm run build` — production build
- `npm run deploy` — build + push to gh-pages branch

---

## File Structure

```
src/
  App.tsx              # All UI components (single file by design)
  App.css              # All styles (single file by design)
  index.tsx            # React entry point
  declarations.d.ts    # Module declarations (e.g. image/audio imports)
  react-app-env.d.ts   # CRA type references
  stores/
    useSoundStore.ts   # Zustand store — all audio logic, auth, state, and type definitions
  assets/images/       # Card background PNGs (rain, cricket, waves, thunder, bonfire, wind, bird, woodcrack)
  sounds/              # Audio MP3 files (rain, cricket, waves, thunder, bonfire, wind, bird, woodcrack)
public/
  sw.js                # Service worker (offline support)
  manifest.json        # PWA manifest
  logo192.png          # Media Session API artwork
  logo512.png          # Media Session API artwork
```

**Architecture principle:** The project is intentionally a single-component file (`App.tsx`) and a single stylesheet (`App.css`). Do NOT split into separate component files or CSS modules unless explicitly asked.

---

## Core Data Model

### Sound IDs (hardcoded, never change)
```
1 = Rain    2 = Cricket    3 = Waves    4 = Thunder
5 = Fire    6 = Wind       7 = Birds    8 = Woodcrack
```
The `NAME_TO_ID` map in `useSoundStore.ts` and `bgMap`/`iconMap`/`authorMap` in `App.tsx` all key off these IDs. If a new sound is added, it must get a new unique ID and entries in all four maps.

### Sound Interface
```ts
interface Sound extends SoundState {
  name: string;      // English, used for URL params and audio key mapping
  name_es: string;   // Spanish display name
  name_ca: string;   // Catalan display name
  audioUrl: string;  // Imported MP3 file path
}
```
Note: `icon` and `category` fields have been intentionally removed. Icons are resolved at render time via the `iconMap` lookup in `App.tsx` (keyed by sound ID), not stored on the Sound object.

### Static Maps in App.tsx
```ts
const bgMap: Record<number, string>           // sound ID → card background image
const iconMap: Record<number, React.ReactNode> // sound ID → React icon component
const authorMap: Record<number, { name; url }>  // sound ID → Freesound credit
```

### Volume Math
```ts
mixVol = (trackVolume * globalVolume) / 10000
```
Both values are 0–100 integers. Result is 0.0–1.0 for Howler. This is the single source of truth — never compute Howler volume any other way.

### Timer Storage
Timer duration is stored in **minutes as a float** (e.g., `15.0`). Each `tick()` subtracts `1/60` (one second). Display converts via `Math.ceil(s * 60)` → mm:ss. Do not change this unit. Available presets: 1, 5, 15, 30, 60 minutes.

### localStorage Keys
```
silence_users_db    — User[] array (passwords SHA256 hashed)
silence_curr_user   — Currently logged-in User object
silence_global_lang — Lang ('ca' | 'es')
```

---

## Languages (i18n)

Supported: **Catalan (`ca`)** and **Spanish (`es`)**. Default is `ca`.

All user-visible strings live in the `dict` object at the top of `App.tsx`. Every new UI string must have entries in BOTH `ca` and `es`. The `useDict()` hook returns the active language's dict. String keys use Spanish-named camelCase (e.g., `volumen`, `pistas`, `estado`).

The `Sound` type carries `name_es` and `name_ca` for bilingual track names. `name` (English) is used only for URL parameters and audio key mapping.

---

## Design Language & Visual Identity

### Color Palette (CSS variables in `App.css`)
```css
--bg: #050505          /* near-black page background */
--accent: #fff         /* primary text and active elements */
--dim: rgba(255,255,255,0.4)  /* secondary/muted text */
--red: #ff3b30         /* danger actions only */
--glass: rgba(255,255,255,0.05)  /* frosted glass fills */
--border: rgba(255,255,255,0.1)  /* subtle borders */
--border-mid: rgba(255,255,255,0.2)  /* slightly more visible borders */
```
Never introduce new base colors. New UI elements must use these variables or their rgba variants at appropriate opacities.

### Typography Rules
- Font: `'Helvetica Neue', -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif`
- All labels, buttons, and UI text: **uppercase**, wide `letter-spacing` (2px–6px)
- Hero titles: `font-weight: 700`, `letter-spacing: -2px`, `clamp(4rem, 10vw, 9rem)`
- Numeric readouts (HUD, timer): `font-family: monospace`, `font-variant-numeric: tabular-nums`
- Body copy (subtitles, descriptions): `font-weight: 300`, wide letter-spacing
- Avoid mixed-case prose in UI elements. Everything is either ALL-CAPS or the system default.

### Spacing & Sizing
- Page horizontal padding: `5vw` (matches both `.navbar` and `.main-content`)
- Cards: `aspect-ratio: 4/5`, `border-radius: 2px` (near-square, sharp corners)
- Pills/toasts/buttons: `border-radius: 100px` (full-round)
- Modals: `border-radius: 0` (sharp, editorial)
- Decorative corner brackets (`.hud-corner`, `.timer-corner`, `.danger-corner`) mark interactive containers — use this pattern for any new "framed" UI element.

### Animation Conventions (Framer Motion)
```ts
// Standard easing — use this for all motion
const ease = [0.16, 1, 0.3, 1]
const trans = (delay = 0, duration = 1.5) => ({ duration, delay, ease })

// Staggered fade-up for new elements entering view
const fadeUp = (d = 0) => ({ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: trans(d) })

// Modal entrance
const modalAnim = (s = 0.9, y = 30, dur = 0.4) => (...)
```
- All new elements that appear/disappear must be wrapped in `<AnimatePresence>` with exit animations.
- Entry animations for scroll-revealed elements use `whileInView` with `viewport={{ once: false, amount: 0.1 }}`.
- Parallax scrolling uses `useScroll` + `useTransform` + `useSpring` — never `scroll` event listeners.
- Transition durations: micro-interactions = 0.2–0.4s; content reveals = 0.8–1.5s; audio crossfades = 2000ms (in Howler, not CSS).

### Custom Cursor
The white dot cursor (`.custom-cursor`) uses `mix-blend-mode: difference`. It scales to `1.5` over interactive elements. The selector list in `CustomCursor` (`button, a, select, input, .sound-editorial-card, .vol-wrapper, .card-vol-hit-area, .preset-btn`) must be updated whenever a new interactive element is added. On touch devices it is hidden via `@media (hover: none) and (pointer: coarse)`.

---

## Audio Engine Rules

- All Howl instances live in the module-level `howls: Record<number, Howl>` object. Never create Howls outside `ensureHowl()`.
- **Always use `playHowl()` / `stopHowl()`** — never call `.play()` / `.stop()` directly, as these bypass the 2-second fade.
- `FADE_DUR = 2000` ms is sacred. Do not change it without explicit instruction.
- `html5: false` is set on all Howls (Web Audio API, not HTML5 Audio). This enables lower latency and volume control.
- After any state change that affects playing sounds, call `rehydrateAudio()` to sync Howler state with Zustand state.
- `stopAll()` is a hard-stop-with-fade helper for presets and resets — it fades all active tracks out simultaneously.

---

## State Management (Zustand)

All application state is in `useSoundStore.ts`. The store is the single source of truth.

**Key patterns:**
- Internal helper `_savePreferences()` is called after every mutation that should persist. Never forget to call it after new state-changing actions.
- `restoreState()` runs at store initialization to rehydrate from `localStorage`.
- `mapSounds(sounds, fn)` is the standard way to batch-update sound array — use it, do not `sounds.map(...)` inline in `set()` calls.
- `safeParse<T>(key, fallback)` is the safe localStorage reader — always use it, never `JSON.parse(localStorage.getItem(...))` directly.
- `applyVolConfig(get, set, vols, timer?)` is the shared helper that `applyPreset`, `applyCustomPreset`, and `applyUrlMix` all delegate to. It handles the full sequence: stop all → set volumes → start playing → save preferences. Any new "apply a mix" action should use this helper.
- Preset configs live in the `PRESETS` constant. To add a new preset, add it there and to the `PresetType` union type.

---

## UI Hooks (App.tsx)

### `useDict()`
Returns the active language's dictionary object from `dict[lang]`.

### `useToast(duration)`
Shared hook for all three HUD notification channels. Returns `[msg, show]` — call `show('text')` to display a toast that auto-clears after `duration` ms. Used three times in `App()` for the three channels (share=3000ms, global=1500ms, track=2000ms).

---

## HUD & Notification System (3 channels)

| Channel | Variable | Location | Trigger | Duration |
|---|---|---|---|---|
| A (share) | shareToastMsg | Below share button (top-right) | Share actions, save confirmations | 3000ms |
| B (global) | globalToastMsg | Screen center, transparent text | Space / M key | 1500ms |
| C (track) | trackToastMsg | Above Dynamic Island | Number keys 1–8 | 2000ms |

New notifications must use one of these three channels. Do not add a fourth channel without strong reason. Channel B is purely for global play-state feedback and must remain visually "ghost-like" (no background, no border). Each channel has a dedicated CSS class (`.share-toast`, `.global-toast`, `.track-toast`).

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `Space` | Global play / pause |
| `M` | Toggle mute (remembers prev volume) |
| `1`–`8` | Toggle individual tracks (matches sound array index) |

Guard: `if (tag === 'INPUT' || tag === 'TEXTAREA') return;` — this must remain on all keyboard handlers. Any new shortcuts follow the same pattern.

---

## Media Session API

Metadata is set once on mount: title `'SILENCE / 01'`, artwork from `/logo192.png` and `/logo512.png`. The playback state syncs in a separate `useEffect` watching `isGlobalPlaying`. Do not add `seekforward`/`seekbackward` handlers — this is not a seekable player.

---

## URL Share Format

Active tracks are serialized as: `?rain=60&waves=30` (track `name.toLowerCase()` as key, volume 0–100 as value).
`NAME_TO_ID` in `useSoundStore.ts` maps these param names back to Sound IDs. After parsing, `window.history.replaceState` cleans the URL immediately. Any new sound must have its name added to `NAME_TO_ID`.

---

## User & Auth System

- Passwords: SHA256 one-way hash via `hashPwd()`. Plaintext is never stored.
- `User.id` is `Date.now().toString()` at registration.
- Custom presets: `user.preferences.customPresets` is `Record<slot (1|2|3), Record<soundId, volume>>`.
- On `logout()`: all audio stops, state resets to defaults, `SK_CURR` is removed from localStorage.
- On `deleteAccount()`: user is removed from `SK_USERS` array, then `logout()` is called.

---

## Responsive Breakpoints

| Breakpoint | Behavior |
|---|---|
| `> 1150px` | Full layout: HUD pill + nav spacing at max |
| `<= 1150px` | HUD and nav tighten (reduced gap/padding) |
| `<= 900px` | Single-column card grid; HUD moves below nav row; `.hidden-mobile` elements hide; no staggered card offsets |
| Touch devices | Custom cursor hidden; `cursor: auto` restored globally |

The `.hidden-mobile` class is used for the global volume slider (pill-right) and the desktop HUD pill. Any element that should not appear on mobile should use this class.

---

## CSS Class Naming Conventions

Inline styles that recur across elements have been extracted to named CSS classes. Key extracted classes include:

- **Dropdown**: `.dropdown-menu`, `.dropdown-item`, `.dropdown-item--danger` — user menu popup (hover states handled via CSS `:hover`, not JS)
- **Toast positioning**: `.global-toast`, `.track-toast`, `.share-toast` — fixed/absolute positioning for the three HUD channels
- **Nav buttons**: `.btn-lang`, `.btn-user-menu`, `.share-anchor` — navbar interactive elements
- **Presets layout**: `.preset-divider`, `.custom-presets`, `.custom-presets-label`, `.custom-preset-slot`, `.preset-btn--dashed` — hero preset section
- **Accessibility**: `.sr-only` — standard screen-reader-only clip-rect pattern
- **User profile**: `.user-profile-container` — user menu wrapper

---

## Rules for Adding New Content

### Style consistency (non-negotiable)
1. **All new UI text is ALL-CAPS** with letter-spacing >= 2px.
2. **No new colors** — use `--accent`, `--dim`, `--red`, `--glass`, `--border`, `--border-mid` or rgba variations of white/black.
3. **No new border-radius values** — use `2px` (cards/modals), `6–8px` (small inputs), `100px` (pills/buttons), `50%` (circles).
4. **All new animated elements** use the standard `ease = [0.16, 1, 0.3, 1]` curve and `<AnimatePresence>` for exit.
5. **New interactive elements** must be added to the CustomCursor hover selector and must have `cursor: none !important` in CSS.
6. **New bilingual strings** require entries in BOTH `ca` and `es` in the `dict` object.
7. **New sounds** require: new ID, entry in `BASE`, `bgMap`, `iconMap`, `authorMap`, `NAME_TO_ID`, a background image in `assets/images/`, and an MP3 in `sounds/`. Sound credit must link to Freesound.org.

### Code style
- Components are defined as named `const` functions (`const Foo = () => ...`), not `function Foo()`.
- All components that receive store data call `useSoundStore()` directly or receive props — no Context API.
- `React.memo` is used on `SoundCard` because it is rendered in a list. Apply to any future list-item components.
- CSS is written in `App.css` with section comments using `/* ── Section Name ─── */` formatting.
- Do not add external CSS libraries or utility frameworks (Tailwind, etc.).
- Recurring inline styles should be extracted to named CSS classes in `App.css`. One-off layout values (specific z-index, flex gap for a unique context) may remain inline.
- Shared UI logic (like toast notifications) should use custom hooks (e.g., `useToast`) rather than duplicating `useState`/`useCallback` patterns.
- Shared store logic (like applying a volume config from presets or URLs) should use internal helper functions (e.g., `applyVolConfig`) rather than duplicating the stop→set→play→save sequence.

### What to preserve during optimisation
- The 2-second audio crossfade (`FADE_DUR = 2000`)
- The parallax scroll effect on the hero section
- The card dimming/blur effect when hovering a neighbour card
- The grayscale-to-color card background transition on play
- The three-channel HUD notification system
- The URL share + immediate cleanup mechanism
- The Media Session API integration
- All `aria-label`, `aria-live`, `role`, and `aria-pressed` attributes
- The `mix-blend-mode: difference` on the navbar and cursor

---

## Known Edge Cases (do not "fix" these)

1. **Space key + focused button:** When a button has browser focus and Space is pressed, our handler fires AND the button re-clicks. This is native browser behavior and acceptable.
2. **Media Session cold start:** The system-level media controls only activate after at least one real user interaction (click). This is a browser security constraint and cannot be worked around.

---

## Deploy

```bash
npm run deploy
# Runs: npm run build && gh-pages -d build
# Pushes build/ to the gh-pages branch of origin
```
The `homepage` field in `package.json` is `https://ZiqiZhu-Lan.github.io/CBS` — this is required for correct asset paths in the GitHub Pages build.

---

## Current Phase Priority

The current priority is **visual excellence, polish, and overall coherence**, not shipping speed.

When tradeoffs appear, prefer:
- Better composition, spacing, motion, and perceived quality
- Stronger consistency with the SILENCE / 01 identity
- Fewer features with higher finish quality
- Slower implementation if it materially improves the final experience

Do not prioritize "good enough" UI if a clearly more refined solution is achievable within reasonable scope.

---

## Quality Bar

This project uses a **hard-gate quality standard** for normal work.

A change should not be considered complete unless it satisfies all applicable checks below:
- Visual style matches the existing editorial minimalism
- New UI text is added to both `ca` and `es`
- Mobile and desktop layouts are both reviewed
- Keyboard behavior is preserved
- Existing audio behavior is preserved
- No existing motion, HUD feedback, or accessibility attribute regresses
- Repeated inline styles are extracted when they become recurring
- New interactive elements are added to the CustomCursor selector logic if needed

If a change fails one of these checks, it is not "done".

---

## Experimental Exception Rule

Occasional experimental or impulsive changes are allowed, but they must be treated as experiments rather than normal production-ready work.

When doing experimental work:
- Clearly label it as experimental in the task or commit message
- Keep the scope isolated and reversible
- Do not weaken core rules unless the experiment is specifically about replacing them
- Before merging or keeping the experiment, bring it back up to the full hard-gate standard

Rule of thumb:
- Exploration can be messy
- Final state cannot be messy

---

## Definition Of Done

A UI-facing change is complete only if all applicable items below are true:
- The result looks intentional on desktop and mobile
- Typography, spacing, and motion feel consistent with the rest of the app
- No new base colors, radius systems, or animation language were introduced
- All bilingual strings are complete
- Hover, active, pressed, focus, and transition states were reviewed
- Touch-device behavior was considered
- If the change is interactive, cursor behavior and keyboard behavior were checked
- If the change affects sound state, `rehydrateAudio()` flow and fade behavior still hold
- If the change affects persistence, localStorage behavior still works
- If the change affects share URLs, parsing and immediate cleanup still work

---

## Visual Review Checklist

Because this phase prioritizes beauty and finish quality, every meaningful UI change should be reviewed against this checklist before being considered complete:
- Does the new element feel like it belongs to SILENCE / 01, or does it feel generic?
- Is the spacing rhythm consistent with nearby sections?
- Are typography scale, casing, and letter spacing correct?
- Does the motion feel calm, premium, and deliberate rather than flashy?
- Does the screen still feel minimal, or has visual noise increased?
- Does the interaction feel better than before, not just different?
- On mobile, does the layout still feel composed rather than merely compressed?

If the answer to any of these is "no", continue refining.

---

## Manual Smoke Test

Before considering a non-trivial change finished, run this manual smoke test:

1. Load the app on desktop.
2. Toggle tracks with mouse/touch and verify the correct sound responds.
3. Press `Space` and verify global play/pause feedback still appears.
4. Press `M` and verify mute behavior still restores previous volume correctly.
5. Press keys `1` through `8` and verify track toggles still map correctly.
6. Adjust individual track volume and global volume, then confirm mix balance is correct.
7. Start a timer preset and verify countdown display behaves correctly.
8. Save or apply any relevant preset flow affected by the change.
9. Test a share URL such as `?rain=60&waves=30` and confirm it applies, then clears from the address bar.
10. Refresh the page and verify expected persisted state restores correctly.
11. Open the app on mobile width and verify layout, readability, and tap targets.
12. Confirm no obvious regression in HUD toasts, modal animation, or card hover/play visuals.

If the change touches auth:
- Register
- Log in
- Log out
- Delete account flow

If the change touches PWA/offline behavior:
- Verify service worker behavior still does not obviously break first-load or refresh flows

---

## Target Devices

The baseline support matrix for review is:
- Desktop Chrome
- Desktop Safari
- iPhone Safari
- Android Chrome

A UI change is not fully reviewed until it has been considered across both desktop and mobile interaction models.

Special attention areas:
- Custom cursor must not affect touch devices
- Navbar/HUD spacing must remain composed at tablet and phone widths
- Buttons and sliders must remain usable without hover
- Motion should still feel smooth on lower-powered mobile devices

---

## Regression Hotspots

The following areas are considered high-risk and must be treated carefully during edits:
- `FADE_DUR = 2000`
- `mixVol = (trackVolume * globalVolume) / 10000`
- `applyVolConfig(...)`
- `rehydrateAudio()`
- The three-channel toast system
- Keyboard shortcut guards for `INPUT` and `TEXTAREA`
- URL share parsing plus immediate `replaceState` cleanup
- Media Session metadata and playback state sync
- Card hover dim/blur behavior
- Grayscale-to-color transition when a track is active

Do not refactor these casually.

---

## Documentation Language Rule

The working documentation language should be **Chinese-first** for team guidance, with code identifiers, commands, API names, and type names kept in English where needed.

Use this style:
- Explanations and rules in Chinese
- Commands in original English form
- Code symbols in original English form
- Avoid mixing large blocks of English prose into process documentation unless necessary

If a rule is important, write it plainly and operationally rather than stylistically.

---

## Scope Note

There is currently **no planned near-term work to add new sound tracks**.

Unless explicitly requested, optimization and design work should focus on:
- Existing 8-track experience
- UX polish
- Visual refinement
- Stability
- Responsiveness
- Accessibility
- Perceived audio quality

Do not introduce "future-proofing" complexity for hypothetical new tracks unless there is a concrete task requiring it.
