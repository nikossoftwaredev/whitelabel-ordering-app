# Feature Website Build Prompt

Copy everything below the line, fill in the `[PLACEHOLDERS]`, delete sections that don't apply.

---

Build a complete, production-ready landing page website for a **[BUSINESS TYPE]** business.

Use the `frontend-design` plugin for ALL UI work. Do NOT make a generic-looking website.

## Business Info

```
Business name:         [NAME]
Tagline:               [SHORT DESCRIPTION]
Address:               [FULL ADDRESS]
Phone:                 [LANDLINE]
Mobile:                [MOBILE NUMBER]
Email:                 [EMAIL]
WhatsApp:              [NUMBER WITH COUNTRY CODE, e.g. 306941469582]
Google Maps link:      [URL OR ADDRESS]
Website/domain:        [IF EXISTS]
Facebook:              [URL]
Instagram:             [URL]
TikTok:                [URL]
Other socials:         [URL]
Working hours:         [e.g. Mon-Sat 08:00-20:00, Sun closed]
Languages:             [e.g. Greek (default), English]
Awards/certifications: [IF ANY]
```

## Images I Provide

- Logo: `public/images/logo.[ext]`
- Hero background: `public/images/hero.[ext]`
- Gallery photos: `public/images/1.jpg` through `public/images/[N].jpg`
- [ANY OTHER IMAGES AND THEIR PATHS]

For any images I DON'T have (services, products, etc.), download real photos from Pexels. Search by keyword, verify EACH image visually matches its intended use before keeping it. Pexels IDs are unreliable — always verify after downloading.

## Sections (top to bottom)

1. **Navbar** — Fixed, transparent over hero, solid on scroll. Logo + name left, nav links center, phone + language switcher + theme switcher + CTA right. Mobile: full slide-in panel from right with backdrop blur overlay (NOT a simple dropdown).

2. **Hero** — Full viewport, background image with dark gradient overlay, headline, subheadline, 2-3 CTA buttons. White text, readable over any image.

3. **About** — Company description + 3 highlight cards (icon + title + description). Two-column layout.

4. **Gallery** — [N] photos in masonry grid. Click opens lightbox with: close button, left/right arrows, keyboard nav (Escape, Arrow keys), image counter, caption, body scroll lock.

5. **Services/Products Overview** — Split columns showing categories with icon lists. Links to detailed sections below.

6. **Services** — 3-column grid of cards. Each card: REAL PHOTO (not icon) with gradient overlay + title on image + description below. Hover: zoom + shadow + lift.

   ```
   [LIST SERVICES WITH CATEGORIES, e.g.]
   - Service Name (category)
   - Service Name (category)
   ```

7. **Products** (if applicable) —
   ```
   [LIST PRODUCT CATEGORIES WITH DESCRIPTIONS]
   ```

8. **Reviews** — Customer testimonials with star ratings, names, review text. Overall rating badge.

9. **Contact** — Left: contact info (address, phone, mobile, email, hours) + embedded Google Map. Right: contact form (name, email, phone, subject, message) that sends via mailto to business email.

10. **Newsletter** — Email signup with branded background, input + button (icon-only on mobile), privacy note.

11. **Footer** — Brand, quick links, contact info, social icons, map, copyright.

Delete any sections you don't need. Reorder as needed.

## Tech Stack

- Next.js with App Router + React Server Components
- next-intl for i18n (messages/[lang].json per language)
- Tailwind CSS 4 with CSS variables + oklch colors
- shadcn/ui (install via `npx shadcn@latest add [component]`)
- Lucide React icons
- next-themes for dark mode (class strategy)
- TypeScript strict mode

## Design Rules

- **Color palette**: Define custom CSS variables in globals.css that match the business identity. Pick a dominant brand color + accent. Use semantic names (--primary, --forest, --cream, etc.).
- **No generic fonts**: Pick fonts that suit the business language and tone. Don't default to Inter/Roboto/Arial.
- **Real photos over icons**: For services and products, use actual photos. Only use Lucide icons for small UI elements and feature highlights.
- **Dark mode**: Every section must work in light AND dark. Test both.
- **Mobile responsive**: Test at 375px. Mobile menu = slide-in panel, never a cramped dropdown.
- **Smooth scrolling**: `scroll-behavior: smooth` on html. All anchor links scroll smoothly.
- **Hover states**: Every clickable element needs cursor-pointer + visible hover effect.
- **Transitions**: Use duration-300 on all state changes. No jarring jumps.

## Architecture Rules

- Server Components by default. Add "use client" only for interactivity.
- For sections needing both i18n AND interactivity: server wrapper (getTranslations) renders a client child (useTranslations + useState).
- Extract ALL business data (phone, email, URLs, socials) into `lib/general/constants.ts` as a single object. Never hardcode in components.
- Every user-visible string in messages/[lang].json. No hardcoded display text.
- shadcn/ui goes in `components/ui/`. Custom components go in `components/`.

## Image Downloads

When downloading from Pexels:
1. Search pexels.com for the specific keyword
2. Pick a photo that ACTUALLY matches the service (not just vaguely related)
3. Download at w=800 quality
4. View/verify the image after downloading — if wrong, search again
5. Save to `public/images/services/[name].jpg` or `public/images/products/[name].jpg`

## After Building

1. `pnpm lint` + `pnpm tsc --noEmit` — fix all errors
2. Test every language
3. Test dark mode
4. Test mobile menu
5. Test gallery lightbox (click, arrows, keyboard, close)
6. Test contact form
7. Test all anchor links scroll smoothly
8. Screenshot and visually verify each section
9. Run code simplifier to deduplicate and extract constants
10. Commit with conventional commit prefixes (feat:, fix:, refactor:)
