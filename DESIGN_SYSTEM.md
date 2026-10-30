# DevCollective Design System

The interior product UI uses a small set of reusable primitives so pages can share the same geometry without changing their data or behavior.

## Visual language

- Neo-brutalist editorial UI with soft pastel surfaces.
- 2px semantic borders using `--outline-variant`.
- Hard shadows remain part of the identity.
- Inter for product/display typography and Space Mono for labels.
- Public landing visuals remain independent from interior workspace geometry.

## Geometry tokens

| Token | Value | Use |
| --- | ---: | --- |
| `--dc-radius-section` | 24px | Large page sections / hero surfaces |
| `--dc-radius-card` | 18px | Cards, panels, content surfaces |
| `--dc-radius-control` | 12px | Buttons, inputs, controls |
| `--dc-radius-small` | 10px | Small utility surfaces |
| pill | 9999px | Badges, avatars, status chips |

## Shadow tokens

Use semantic shadows instead of hardcoding a color into reusable components:

- `--dc-shadow-sm` — compact controls
- `--dc-shadow-md` — cards
- `--dc-shadow-lg` — primary surfaces

Dark mode intentionally uses a dark shadow color rather than mapping shadows to `--outline-variant`, because that token becomes light in dark mode.

## UI primitives

Located in `src/components/ui/`:

- `DcButton`
- `DcCard`
- `DcBadge`
- `DcSectionHeader`
- `DcEmptyState`
- `ErrorBoundary`

Primitives should own repeated geometry and semantics. Page components should continue to own page-specific data, API calls, Supabase interactions, and business rules.

## Migration rule

Migration is staged at the page level, but the shared foundation is now in place across the main workspace surfaces. Preserve existing handlers, API calls, auth state, routing, and business logic when adopting primitives.

Do not modify Supabase schema, authentication, REP logic, routing, or community backend as part of a visual component migration.

## State, recovery, and accessibility

- Loading states should use stable layout surfaces rather than blank screens.
- Empty states should explain what is missing and provide an action when one exists.
- Recoverable page failures are contained by `src/components/ErrorBoundary.tsx`.
- Interactive elements keep native button/link/form semantics; primitives should not replace a semantic element merely for styling.
- Icon-only controls must have an accessible label or equivalent text.

## State and behavior

UI primitives should be presentational and accept state/handlers through props. React recommends keeping a single source of truth for coordinated state and composing reusable components for repeated UI. See the React documentation for [sharing state](https://react.dev/learn/sharing-state-between-components) and [component composition](https://react.dev/learn/your-first-component).
