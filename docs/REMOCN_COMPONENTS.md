# Remocn components

Remocn is a copy-paste shadcn registry, not a runtime package dependency. The source is owned under `src/components/remocn/` and remains deterministic because it uses Remotion frame APIs.

| Component | Purpose | Used by | Official source |
|---|---|---|---|
| `SoftBlurIn` | Per-character blur and rise reveal | `TitleScene` | [registry source](https://github.com/Remocn/remocn/tree/main/registry/remocn/soft-blur-in) |
| `SpringScaleIn` | Staggered spring-like word scale reveal | `ComparisonScene`, `NumberScene` | [registry source](https://github.com/Remocn/remocn/tree/main/registry/remocn/spring-scale-in) |
| `StaggeredFadeUp` | Installed primitive reserved for concise word reveals | Available for future scene variants | [registry source](https://github.com/Remocn/remocn/tree/main/registry/remocn/staggered-fade-up) |

Installed with:

```bash
npx shadcn@latest add @remocn/soft-blur-in @remocn/spring-scale-in @remocn/staggered-fade-up --yes
```

The current registry manifest was treated as authoritative because some older component documentation still references previous names such as `blur-reveal`.
