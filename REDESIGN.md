# ETE Campus redesign

## What changed
- Student routine remains the home page. Teachers (/teachers), classrooms (/classrooms), and holidays (/holidays) now have dedicated, linkable pages.
- Mobile day selectors for student, teacher, and classroom schedules; full weekly tables remain on larger screens.
- Searchable teacher/classroom directories, existing schedule exports, weekly modifications, and semester calculations retained.
- Admin workspace with grouped navigation, quick task cards, responsive forms, and mobile navigation.
- Six new animated display styles: Aurora, Ocean, Sunset, Orbit, Blueprint, and Editorial. Each has its own Light and Dark selection (12 choices), independent of admin mode.
- Motion respects the device's reduced-motion accessibility setting.
- Added directory/calendar error messages and retry controls. Fixed admin refresh redirect timing and removed token-bearing request logging.

## Run locally
Use Node.js 20 or later:

```sh
npm ci
npm run dev
```

Production build:

```sh
npm run build
```

Deploy the generated `dist` folder through your existing web host. Configure SPA fallback so /teachers, /classrooms, /holidays, and /admin/dashboard routes resolve to index.html when opened directly.

## Required backend update for new themes
Use your existing Supabase project and credentials. This ZIP does not apply changes to the live service.

1. Apply the new migration `supabase/migrations/20260925150000_display_theme_variants.sql` through your normal migration workflow. It expands the permitted theme IDs without replacing existing data.
2. Deploy the updated `supabase/functions/admin/index.ts` using your existing Supabase Edge Function deployment workflow.
3. Deploy the frontend build.
4. Open Admin → Settings, choose a style and explicit Light/Dark variant, then click Apply theme.

With a linked Supabase CLI, the usual commands are `supabase db push` and `supabase functions deploy admin`; review pending migrations before pushing. Existing Classic, Pulse, and Broadcast settings continue to load. The display refreshes settings through its existing subscription and 30-second polling fallback.

## Scope
This is a routine/schedule application. No academic grades/results system was added. Existing backend access rules and data were retained. Live authentication, database writes, and deployment require the owner's environment.

## Validation performed
- Production build passed (`npm run build`).
- TypeScript check passed (`npx tsc --noEmit -p tsconfig.app.json`).
- Browser smoke checks covered 14 public/admin/display routes at widths 360, 768, and 1440 pixels (42 combinations), with no horizontal page overflow or uncaught JavaScript errors.
- Teacher and classroom search selection checked on mobile.
- All 12 display variants checked for explicit light/dark mode behavior while the admin preference was dark.
- Student mobile routine and desktop theme selection screenshots visually reviewed.

Browser checks used mocked API responses and a test admin session. They did not authenticate to or write to the live backend. The existing large-JavaScript-bundle warning remains; it does not block the production build.
