# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development

```bash
pnpm dev        # Start development server on http://localhost:3000
pnpm build      # Build for production
pnpm start      # Start production server
pnpm lint       # Run ESLint
pnpm tsc --noEmit  # Check TypeScript errors
```

### Adding UI Components

```bash
npx shadcn@latest add <component>  # Add new shadcn/ui components
```

## Architecture

### Tech Stack

- **Next.js 16.1.1** with App Router and React Server Components
- **NextAuth.js 4.24** for authentication (Google OAuth)
- **next-intl 4.7.0** for internationalization (en, el locales)
- **Tailwind CSS 4** with CSS variables and modern color space
- **shadcn/ui** components (New York style)
- **TypeScript** with strict mode
- **Zustand** for client-side state management
- **sharp** for server-side image compression

### Project Structure

- `app/[locale]/` - Dynamic locale-based routing (page.tsx = landing page, admin/ = admin panel)
- `app/api/auth/[...nextauth]/` - NextAuth API routes
- `components/` - Custom components (landing page sections, shared components)
- `components/ui/` - shadcn/ui components ONLY (do not put custom components here)
- `components/auth/` - Authentication components
- `components/admin/` - Admin panel components (sidebar, header)
- `components/examples/` - Example/demo components (ThemeSwitcher, LanguageSwitcher)
- `lib/i18n/` - Internationalization configuration
- `lib/auth/` - NextAuth configuration
- `lib/general/` - General utilities (`utils.ts`, `constants.ts` for business data)
- `lib/stores/` - Zustand state stores (e.g., `dialog-store.ts`)
- `lib/files/` - File upload utilities (S3/Supabase storage with sharp compression)
- `messages/` - Translation files (en.json, el.json)
- `public/images/` - Static images (logo, gallery, hero, services)
- `proxy.ts` - Middleware for i18n routing (not middleware.ts)
- `types/` - Shared TypeScript interfaces

### Key Patterns

#### Internationalization

- All pages/layouts receive `params: Promise<{ locale: string }>`
- Server components: Use `await getTranslations()` with `setRequestLocale(locale)`
- Type-safe translations via `global.d.ts`
- Navigation helpers in `lib/i18n/navigation.ts` (Link, redirect, useRouter)

#### Component Development

- Default to Server Components, use "use client" only when needed
- Always await params in pages/layouts (Next.js 16 requirement)
- Use `@/` path alias for imports
- Utility function `cn()` in `@/lib/general/utils.ts` for merging Tailwind classes

#### UI & Design Rules

- **Always use the frontend-design plugin** when working on any design or UI task
- **Always use shadcn/ui components** — search the web for the correct install command (`npx shadcn@latest add <component>`) and usage patterns before implementing. Do not guess component APIs; look them up.
- **Always use Lucide icons** (`lucide-react`) — they are the icon set used by shadcn/ui. Search for the right icon name on the web when needed.
- **`components/ui/` is reserved for shadcn/ui components only** — custom components go in `components/`
- Use `CircleIcon` (`components/CircleIcon.tsx`) for general icon display with colored circular backgrounds
- Use `SocialIcon` (`components/social-icon.tsx`) for social media link icons with platform-specific colors
- **Business constants** — All hardcoded business data (phone, email, URLs, social links) lives in `lib/general/constants.ts`. Never scatter magic strings across components.

#### Loading States

- **Every route group has a `loading.tsx`** — Use the reusable `LoadingScreen` component (`components/loading-screen.tsx`) which matches the app theme. When adding a new route group or page directory, always create a `loading.tsx` that imports and renders `<LoadingScreen />`.

#### Landing Page Patterns

- **Server/client split** — Sections needing i18n + interactivity use a server wrapper (`getTranslations`) rendering a client child (`useTranslations` + `useState`). Example: `gallery-section.tsx` → `gallery-grid.tsx`.
- **Navbar** — Fixed, transparent over hero, solid on scroll. Toggle `border-transparent`/`border-border` (not `border-b` on/off) to avoid transition flicker.
- **Mobile menu** — Slide-in panel from right with backdrop blur overlay and body scroll lock. Never a simple dropdown.
- **Smooth scrolling** — `scroll-behavior: smooth` on html in globals.css for all anchor links.
- **Real photos for services** — Use actual photos with gradient overlays instead of generic Lucide icons for service/product cards.

#### Dialog System

All dialogs share a single container managed by a Zustand stack. Content swaps inside a stable shell — the container never unmounts/remounts between stacked dialogs.

**Architecture:**
- **Store**: `lib/stores/dialog-store.ts` — stack-based (`openDialog` pushes, `closeDialog`/`goBack` pops, `closeAll` clears). Integrates with browser history via `pushState`/`popstate`.
- **Provider**: `components/dialog-provider.tsx` — renders ONE `<Dialog>` + `<DialogContent>` that conditionally shows the current dialog's content via `DIALOG_KEYS`. All content components are lazy-loaded.
- **Keys**: Use `DIALOG_KEYS` constants from `dialog-provider.tsx` when opening dialogs (e.g., `openDialog(DIALOG_KEYS.CART)`). Never use raw string literals.

**Creating a new dialog:**
1. Create content component (e.g., `components/order/my-dialog.tsx`) exporting `MyContent`
2. Add lazy import + key in `dialog-provider.tsx`
3. Add `{currentDialog === DIALOG_KEYS.MY_DIALOG && <MyContent />}` in the render

**Content component structure** — every dialog content MUST follow this pattern:
```tsx
<div className="flex flex-col overflow-y-auto flex-1">
  <DialogHeader>
    <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
  </DialogHeader>
  {/* Scrollable content with its own px-* padding */}
  <div className="overflow-y-auto flex-1 px-5">...</div>
  {/* Optional sticky footer */}
  <div className="border-t border-border p-4 shrink-0">...</div>
</div>
```

**Rules:**
- **Always use `DialogHeader`** for the title area — it handles padding for nav buttons (back/close) on both mobile and desktop. Never use custom header divs or `dialogPanelHeaderClass` (removed).
- **`DialogContent` has `p-0`** — content components manage their own padding. `DialogHeader` handles its own padding internally.
- **Desktop**: fixed height (`min(600px,85vh)`) so stacked dialogs don't jump sizes. X button always visible top-right. Back arrow top-left when stacked.
- **Mobile**: full-screen. Back chevron top-left (closes or goes back in stack).
- **Stacking**: opening a dialog from inside another pushes onto the stack. The back button pops one level. X closes all.
- Use individual Zustand selectors (not full store destructuring) to avoid unnecessary re-renders.
- `components/confirm-dialog.tsx` is the reusable confirm/delete dialog (key: `CONFIRM_DIALOG`)

#### File Uploads

- `lib/files/upload.ts` handles S3-compatible uploads to Supabase storage
- All images are auto-compressed and converted to WebP via `sharp` before upload
- `uploadFile(buffer, fileName)` returns the public URL (extension changed to `.webp`)
- `deleteFile(fileUrl)` removes a file by its public URL

#### Styling

- CSS variables defined in `app/globals.css` (includes custom brand colors like `--forest`, `--leaf`, `--cream`)
- Dark mode via `next-themes` with class strategy
- Custom Tailwind variant: `@custom-variant dark (&:is(.dark *))`
- Always use semantic color naming (e.g., `text-foreground`, `bg-background`)
- Use Tailwind 4 canonical classes (`z-100` not `z-[100]`, `bg-linear-to-t` not `bg-gradient-to-t`)
- All transitions should use `duration-300` — no jarring state changes

## Authentication Setup

### NextAuth Configuration

- **Provider**: Google OAuth configured in `lib/auth/auth.ts`
- **Session Management**: SessionProvider wraps the app in `components/providers.tsx`
- **Environment Variables Required**:
  - `NEXTAUTH_SECRET`: Secret key for JWT encryption
  - `NEXTAUTH_URL`: Application URL (http://localhost:3000 for development)
  - `GOOGLE_CLIENT_ID`: From Google Cloud Console
  - `GOOGLE_CLIENT_SECRET`: From Google Cloud Console

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.developers.google.com/apis/credentials)
2. Create a new OAuth 2.0 Client ID
3. Set Authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-domain.com/api/auth/callback/google`
4. Copy Client ID and Client Secret to `.env.local`

## Important Notes

- **PNPM Required**: This project uses PNPM workspaces
- **Locale Validation**: Layout validates locale and returns 404 for invalid locales
- **Static Generation**: Uses `generateStaticParams()` for all locale variants
- **Prisma Setup**: Connected to Supabase PostgreSQL database with User and Todo models

## Development Guidelines

All coding rules, style preferences, and best practices are in `tasks/lessons.md`. Review at session start.

## Workflow Orchestration

### 1. Plan Mode Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy

- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop

- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done

- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests - then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

## Screenshot Workflow

- Puppeteer is installed as a devDependency with bundled Chromium.
- **Always screenshot from localhost** — ensure `pnpm dev` is running first.
- Take a screenshot: `node screenshot.mjs http://localhost:3000`
- Add a path for specific pages: `node screenshot.mjs http://localhost:3000/en/admin`
- Screenshots save to `screenshots/screenshot-N.png` (auto-incremented, never overwritten).
- Optional label: `node screenshot.mjs http://localhost:3000 label` → `screenshot-N-label.png`
- After screenshotting, read the PNG with the Read tool to visually inspect the UI.
- When comparing against a reference, be specific about differences: spacing, font sizes, colors (hex), alignment, border-radius, shadows.

### Auto-Verification Rule

**After each meaningful UI change (a section, component, or layout adjustment), you MUST:**

1. Run `node screenshot.mjs http://localhost:3000/<relevant-path> <label>` to capture the result
2. Read the PNG with the Read tool and visually inspect it
3. Check that the change matches what was requested — look for layout issues, broken styling, misalignment, missing elements
4. If something looks wrong, fix it and screenshot again — repeat until it looks correct
5. Only then move on to the next change

**Do NOT batch all changes and screenshot once at the end.** Verify incrementally after each section so issues are caught early and fixed in isolation.
