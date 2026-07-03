# CLAUDE.md — MORE-UI

Guidance for AI agents (and humans) working in this repository.

## Project overview

This is the frontend for **app.more.markets** — a DeFi application on **Flow EVM** offering:

- **Lending markets** — supply/borrow assets with variable rates. The markets stack is a
  fork of the **Aave v3 interface** (hence `@aave/contract-helpers`, `@aave/math-utils`,
  and the `reserve-overview` / `dashboard` / `markets` modules).
- **Curated vaults** — professionally-managed yield vaults built on **MORE Vaults**
  (`@oydual31/more-vaults-sdk`), surfaced as "Flow Earn".

The app currently ships as a single production surface (the Flow deployment). A former
`default`/`flow` theme duality has been fully removed — there is no runtime theme switch.

## Hard rules (read before editing)

- **NEVER run `git add`, `git commit`, `git push`**, or any state-mutating git command
  (no `stash`/`checkout`/`restore`/`clean`). The user owns all git. Read-only git
  (`status`, `diff`, `log`) is fine.
- **Package manager is `yarn`** (v1). Never use `npm`. No dependency changes unless asked.
- **Repo conventions govern all new code:**
  - PascalCase component filenames — `PageMasthead.tsx`, `TopInfoPanel/`.
  - kebab-case feature directories under `src/modules/` — `reserve-overview/`, `vault-detail/`.
  - Shared components live in `src/components/` (PascalCase folders).
  - Routes are `pages/**/*.page.tsx` (the `.page.tsx` suffix is enforced by
    `pageExtensions` in `next.config.js`).
  - **MUI `sx`-first styling.** Never introduce Tailwind, kebab-case component filenames,
    a `src/lib/` folder, or CSS-in-JS outside emotion/MUI.
  - Mirror the closest existing sibling file when adding code.
- **No functional changes during redesign work:** hooks, the zustand store, services,
  `*Actions.tsx` transaction files, providers, API routes, and routing stay untouched
  unless the task explicitly names the file.
- **Preserve key names, change values only** (see Design system → Stable API).

## Stack

| Concern            | Choice                                                                       |
| ------------------ | ---------------------------------------------------------------------------- |
| Framework          | Next.js **14.2.35**, **Pages Router**                                        |
| UI library         | MUI **v5** (`@mui/material` ^5.10) + `@mui/lab` + `@mui/icons-material`       |
| Styling            | emotion 11 (`@emotion/react`, `@emotion/styled`) via MUI `sx`                |
| State              | zustand ^4 (`src/store/`)                                                     |
| Wallet / chain     | wagmi ^2 + `@rainbow-me/rainbowkit` ^2 + viem 2.23 — plus **legacy** `@web3-react/core` ^6 |
| Data fetching      | `@tanstack/react-query` **v4** — plus **legacy** `react-query` **v3**        |
| Ethers             | ethers **^5**                                                                |
| Aave core          | `@aave/contract-helpers` 1.28, `@aave/math-utils` 1.28                       |
| Vaults SDK         | `@oydual31/more-vaults-sdk` 1.1.x                                            |
| Charts             | `lightweight-charts` ^5 + `@visx/*` ^3.12                                     |
| Analytics          | `mixpanel-browser`                                                           |
| Lint / format      | ESLint (`next lint`) + Prettier ^2.8                                          |
| Node / yarn        | Node 20+ (dev on 24), yarn 1.22                                               |

Two library generations coexist intentionally (`react-query` v3 **and** v4; `web3-react`
**and** wagmi). Do not "consolidate" them — legacy paths are still wired to live features.

## Architecture map

Data flows **pages → modules → components + hooks/store/services/libs**.

- `pages/**/*.page.tsx` — thin route entries (e.g. `index`, `markets/index`,
  `markets/[underlyingAsset]`, `vaults/index`, `vaults/[vaultId]`, `history`, `faucet`,
  `bridge`). Each mostly composes a module.
- `src/modules/<feature>/` — feature assemblies (kebab-case dirs): `markets`, `dashboard`,
  `reserve-overview`, `vaults`, `vault-detail`, `history`, `charts`, `faucet`, `migration`,
  `staking`.
- `src/components/` — shared/reusable UI (PascalCase folders).
- `src/hooks/`, `src/store/` (zustand), `src/services/`, `src/libs/`, `src/utils/`,
  `src/helpers/`, `src/ui-config/`, `src/architecture/` — supporting layers.

Key wiring:

- **App shell:** `pages/_app.page.tsx` mounts every provider (Wagmi → React Query →
  RainbowKit → Web3React → `AppGlobalStyles` → `ModalContextProvider` →
  `SharedDependenciesProvider` → `AppDataProvider` → `VaultProvider` → `GasStationProvider`
  → sanctions/blocking), and mounts all **global transaction modals** (`SupplyModal`,
  `WithdrawModal`, `BorrowModal`, …) plus the single `<Meta />`.
- **Emotion SSR:** handled in `pages/_document.page.tsx` via `@emotion/server`
  `createEmotionServer` + `src/createEmotionCache.ts`. Don't break this — it prevents FOUC.
- **Modals:** `ModalContextProvider` in `src/hooks/useModal.tsx` drives the global modals.
- **Inline action panels:** the newer flows use an in-page side panel instead of a modal —
  `src/components/ActionPanel/ActionSidePanel.tsx` + a `ScopedTxContext`, consumed by
  `src/modules/vault-detail/VaultActionsPanel.tsx` and
  `src/modules/reserve-overview/ReserveActionsPanel.tsx`.
- **Meta / SEO:** single source `src/components/Meta/Meta.tsx` (Flow Earn title/description
  + Flow favicon). Mounted once in `_app`.

## Design system

The visual redesign is driven by a shared token system mirrored from the sibling design
repos (see Design reference).

- **Tokens:** `src/styles/tokens.css` — CSS custom properties on `:root` (light) with a
  full `html.dark` override block. Any component may read them in `sx` via `var(--token)`.
- **Theme:** `src/utils/theme.tsx` — `getDesignTokens(mode)` builds the MUI palette +
  typography; `getThemedComponents(theme)` supplies component overrides. Font stacks are the
  `FONT_DISPLAY` / `FONT_BODY` / `FONT_MONO` constants at the top of the file.
- **Dark mode:** `src/layouts/AppGlobalStyles.tsx` owns the mode (`localStorage.colorMode`
  + `prefers-color-scheme`), toggles `document.documentElement.classList` `dark`, and
  exposes `ColorModeContext` (flipped by `src/layouts/components/DarkModeSwitcher.tsx`).
  **Both light and dark must always work** — tokens flip via `html.dark` + the MUI palette.

### Fonts (self-hosted, `public/fonts/`)

| Role     | Family        | Files                                                        |
| -------- | ------------- | ------------------------------------------------------------ |
| Display  | General Sans  | `public/fonts/general-sans/` (weights 500/600/700)           |
| Body     | Inter         | `public/fonts/inter/Inter-latin.woff2` (variable 100–900)    |
| Numerals | JetBrains Mono | `public/fonts/jetbrains-mono/JetBrainsMono-latin.woff2`      |

Each family has a sibling `*.css` `@font-face` file; all three are imported at the top of
`pages/_app.page.tsx`. **ALL numerals render in JetBrains Mono** (via the numeric-display
typography variants in the theme).

### The rules

- **Brand orange is the only control accent:** `#F59042` (light, `--brand-500`) /
  `#FFA15A` (dark, `--app-bold-orange`). Nothing else colors interactive controls.
- **Pastels are decorative only** (`--pastel-*`) — never on controls or as text.
- **Borders are 1px `--line`.**
- **Buttons are pill-shaped** (`--radius-pill`); surfaces use the radius scale
  (`--radius` 0.625rem, `--radius-xl`).
- **Banner-wave hero cards are theme-invariant** (intentionally dark in both modes — the
  `--app-bold-*` token family).

### Stable API — preserve these names, change values only

Renaming any of these breaks consumers across the codebase. Change values, never keys.

- **Typography variants:** `display1`, `main40|25|21|19|16|14|12`,
  `secondary25|21|19|16|14|12`, `subheader1|2`, `description`, `caption`,
  `buttonL|M|S`, `helperText`, `tooltip`.
- **Palette keys:** `background.{surface,surface2,surface3,bg,header,disabled}`,
  `text.{muted,highlight}`, `gradients.*` (incl. `moreGradient`, `newGradient`,
  `flowBackgroundLight`, `flowBackgroundDark`), `other.*`.
- **Button variant:** `gradient`.
- **Breakpoints:** `xsm 640, sm 760, md 960, mdlg 1125, lg 1280, xl 1575, xxl 1800`.

## Design reference

Canonical mockups live in a **local sibling repo**: `/Users/uno/Desktop/more-markets-mockups`
(the source of truth for layouts + banner-wave gradients). Token *values* trace to
`/Users/uno/Desktop/more-markets-landing/src/app/globals.css` — on any token conflict, that
file wins. Both are outside this repo; do not copy their build tooling here.

## Commands

```bash
yarn dev            # local dev server — http://localhost:3000
yarn tsc --noEmit   # fast type check (primary gate)
yarn lint:code      # ESLint over src + pages
yarn lint:formatting# Prettier --check
yarn build          # production build — needs env vars (below)
```

- `yarn build` **requires** `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` to be set
  (consumed in `src/utils/wagmi.ts`); wallet init throws without it.
- **NEVER run `yarn build` while `yarn dev` is running** — the `.next` dir collides.

## Verification norms

There is **no active test suite** for UI work. `jest.config.js` and Cypress configs exist,
but there are no unit/e2e test files exercising the redesign — do **not** add a test
framework. Verify changes with, in order:

1. `yarn tsc --noEmit` — must be clean.
2. `yarn lint:code` — introduce **no new** errors.
3. `yarn build` (with the env var) for anything non-trivial.
4. Visual check in `yarn dev` against the mockups, in **both light and dark** mode.

Run `yarn prettier --write <touched files>` before finishing any change.
