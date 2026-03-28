# transit — Claude Code Guidelines

A React + TypeScript + Vite app visualizing transit data using Leaflet maps and Chart.js.

---

## Quick Reference

```
transit/
├── CLAUDE.md              <- this file
├── .claude/settings.json  <- permissions for autonomous operation
├── src/
│   ├── components/        <- React components (MapView, etc.)
│   ├── data/              <- data files
│   ├── __tests__/         <- test files
│   ├── constants.ts       <- shared constants
│   └── types.ts           <- shared types
```

---

## Build Commands

| What  | Command         |
| ----- | --------------- |
| Dev   | `npm run dev`   |
| Build | `npm run build` |
| Test  | `npx vitest`    |
| Lint  | `npm run lint`  |

---

## Code Standards

- TypeScript: prefer `interface` over `type` for object shapes; no `any`
- React: co-locate component types with the component, not in shared types files
- No `console.log` left in production code
- No commented-out code
- No speculative abstractions — build for what's needed now
- Don't use strings in comparisons, make constants or enums 

### Extract a function when:
- Same logic appears 3+ times
- A block has a clear name that makes the caller more readable

### Shared types (`types.ts`) when:
- A type is used across 3+ modules with no natural parent-child relationship

---

## Notification

After finishing work, run: `afplay /System/Library/Sounds/Funk.aiff`
