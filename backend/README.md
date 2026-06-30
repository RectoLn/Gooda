# Gooda Backend Boundary

The current editor MVP is frontend-only. This folder is reserved for backend code once Gooda starts using Qiandao OpenAPI capabilities that should not run directly in the WebView.

## Put Backend Work Here When It Needs

- App secrets or OAuth token exchange.
- SPU search aggregation that requires server-side credentials.
- User asset sync across devices.
- Template publishing, moderation, or audit logs.
- Server-side image processing or AI tasks.

## Do Not Put In Frontend

- Qiandao app secrets.
- Client credential token requests.
- Long-lived access tokens.
- Private OpenAPI calls that require trusted headers.

## Suggested Future Shape

```text
backend/
  README.md
  package.json
  src/
    app.ts
    qiandao/
      auth.ts
      spu.ts
    storage/
      user-assets.ts
```

Until the first backend API is implemented, keep this folder as documentation only.
