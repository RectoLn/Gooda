# Gooda Project Structure

This repo keeps the current Taro app at the repository root so existing Qiandao H5 deployment and local dev commands stay unchanged.

## Runtime Layout

- `qdmp.json`
  - Qiandao mini-app identity. Keep this at the repo root for the deploy CLI.

- `src/`
  - Frontend Taro / Vue application.
  - User-facing editor code lives under `src/pages/index`.
  - Shared frontend integration boundaries live under `src/services`.

- `src/services/qiandao/`
  - Frontend-safe Qiandao integration boundary.
  - Put SPU search clients, mark/wish read APIs, and SDK adapters here.
  - Do not put app secrets or OAuth client-secret flows here.

- `backend/`
  - Reserved backend boundary for Qiandao OpenAPI work that needs secrets, token exchange, persistence, or server-side aggregation.
  - The current MVP is frontend-only; this folder documents where backend code should land when needed.

- `config/`
  - Taro build config.
  - `h5.publicPath` must stay `./` for Qiandao uploaded H5 bundles.

- `docs/`
  - Product, release, and local workflow notes.

## Editor Page Layout

- `src/pages/index/index.vue`
  - Page orchestrator and state owner.

- `src/pages/index/components/`
  - Presentational editor components. Props in, events out.

- `src/pages/index/editor-core.ts`
  - Side-effect-free editor data, constants, and types.

- `src/pages/index/editor-export.ts`
  - Canvas export composition and platform fallbacks.

- `src/styles/gooda-theme.css`
  - Shared visual language for the current editor.

## Integration Rules

- Keep Qiandao OpenAPI secrets out of frontend code.
- Frontend code may call Qiandao native SDK abilities and public/proxied endpoints through `src/services`.
- Add a backend before implementing client credentials, authorization-code exchange, or APIs requiring app secrets.
- Keep storage-heavy image data out of synchronous storage. Use IndexedDB on H5/Qiandao WebView, and keep sync storage metadata small.
- Before Qiandao upload, run `npm run build:h5` and confirm `dist/index.html` references `./js` and `./css`, not `/js` or `/css`.
