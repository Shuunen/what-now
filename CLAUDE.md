# CLAUDE

## Project docs

- `README.md` — project description, features, TODOs
- `src/webhook/webhook.md` — webhook server protocol
- `CHANGELOG.md` — release history, [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format

## Versioning

Follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html). On every user-facing change:

1. Bump `version` in `package.json` (MAJOR for breaking changes, MINOR for new features/UX, PATCH for fixes)
2. Add an entry to `CHANGELOG.md` under a new `## [x.y.z] - YYYY-MM-DD` section, grouped by Added/Changed/Fixed/Removed
3. Update the compare links at the bottom of `CHANGELOG.md`

## After any codebase change

Run `pnpm check` (types, formatting, lint, build, tests). Fix all failures before done.

## Linting rules

Never disable a lint rule without asking the user. Try to fix the code first then if too complex, ask the user if they want to disable the rule for that line/file.

## Code practices

- **Constants**: camelCase only, never UPPER_SNAKE_CASE
- **Absent values**: `undefined`, never `null`; use `isNil` from es-toolkit to check
- **Narrowing**: use `invariant(x, "msg")` from es-toolkit — never `x!` or silent `if (!x) return`

## Testing practices

- **Globals**: `describe`, `it`, `expect` are global — do not import them
- **File naming**: `.test.ts` / `.test.tsx` only, never `.spec.ts`
- **Spacing in tests**: in unit and e2e files, inside `test`/`it` blocks, do not include empty lines for visual spacing
- **Selectors**: `getByTestId` / `queryByTestId` / `getAllByTestId` only — no role/text/label queries
- **testid format**: kebab-case; use `kebabCase` from es-toolkit for dynamic ids
- **Assertions**: never `toBeInTheDocument()` after `getByTestId` (redundant); use `toHaveTextContent`, `toHaveClass`, `toHaveAttribute` instead
- **Fail loudly**: pair `expect(x).toBeDefined()` with `invariant(x, "msg")` — never `if (!x) return`
- **Type checks**: `toBeTypeOf("number")` over `expect(typeof x).toBe("number")`
