# AGENTS

## Project Commands

- Install deps: `pnpm install`
- Dev server: `pnpm dev`
- Production build: `pnpm build`
- Preview build: `pnpm preview`
- Lint check: `pnpm lint:check`
- Lint fix: `pnpm lint:fix`
- Type check: `pnpm typecheck`
- Format check: `pnpm format:check`
- Format write: `pnpm format`

## Test Commands (Vitest)

- All tests: `pnpm test`
- Unit tests: `pnpm test:unit`
- Component tests: `pnpm test:component`
- Integration tests: `pnpm test:integration`
- Coverage: `pnpm test:coverage`

## Config Persistence (URL Share)

- The starter persists config in URL query param `cfg`.
- Format: `?cfg=v1.<compressed-payload>`.
- Payload includes:
  - current `/get-started/...` route
  - serializable wizard/config state
- Behavior:
  - refresh restores progress
  - opening a shared link restores exact route + config
  - updates are written with debounced history replacement
  - legacy `#cfg=v1...` links are migrated to query-param URLs on client load
- Compatibility:
  - versioned payload (`v1`)
  - unknown keys are ignored
  - missing keys fall back to defaults
  - unsupported versions soft-fail with warning
- Security:
  - sensitive key patterns (`password`, `token`, `secret`, private-key-like) are stripped before encoding
  - file/binary uploads are excluded
