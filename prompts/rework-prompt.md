# Website Rework Prompt

Paste this into a Claude Code session to rework an existing website into this Next.js stack.

---

## Usage

Replace `<TARGET_URL>` with the website you want to rework, then paste everything below the line into Claude Code.

---

## Prompt

I want you to rework an existing website into this Next.js project. The target site is: `<TARGET_URL>`

Follow CLAUDE.md and tasks/lessons.md for all conventions, code style, and component usage.

### Phase 1: Crawl & Extract

Before writing any code, fully crawl the target website:

1. **Discover all pages** - Use WebFetch to read the homepage and extract every internal link. Follow each link to map the full site structure. List every page you find.
2. **Extract content from every page** - For each page, capture: headings, body text, CTAs, navigation items, footer content, metadata (title, description, OG tags).
3. **Download all images** - Find every image on every page (hero images, logos, icons, backgrounds, team photos, product images). Download each one using curl and save to `public/images/`. Use descriptive filenames (e.g., `hero-banner.jpg`, `team-photo-john.jpg`, not `img1.png`).
4. **Screenshot every page** - Use `node screenshot.mjs <url> <page-name>` to capture the visual layout of each page for reference.
5. **Document the site map** - Write a summary of what you found: pages, sections per page, images saved, navigation structure, color scheme, fonts used.

Do NOT proceed to design until the crawl is complete and you have confirmed all images are saved locally.

### Phase 2: Design

Use the frontend-design plugin to design the reworked site:

1. **Analyze the original** - Review the screenshots and extracted content. Identify what works and what needs improvement.
2. **Plan the new design** - For each page, plan the layout, sections, and component hierarchy. The design must be:
   - **Modern and professional** - Clean layouts, generous whitespace, clear visual hierarchy
   - **NOT AI-generated looking** - No generic stock-photo hero sections, no cookie-cutter SaaS layouts, no overuse of gradients. It should feel hand-crafted and intentional.
   - **SEO-optimized** - Proper heading hierarchy (single H1 per page), semantic HTML, meta tags, alt text on all images, structured content
   - **Fast** - Optimize images (use Next.js Image component), minimize client-side JS, prefer Server Components
3. **Use shadcn/ui components** - Search the web for the correct component APIs before using them. Do not guess.
4. **Present the design** - Show me the plan for each page before building. Get my approval.

### Phase 3: Build

Implement page by page, section by section:

1. **One page at a time** - Start with the homepage, then inner pages.
2. **One section at a time** - Build each section (hero, features, about, footer, etc.) individually.
3. **Screenshot after each section** - Follow the Auto-Verification Rule in CLAUDE.md. After completing each section, take a screenshot, read the PNG, and verify it looks correct before moving on.
4. **Use the project stack** - shadcn/ui components, Tailwind CSS with semantic colors, Lucide icons, Next.js Image for all images, next-intl for any text content.
5. **All images from public/images/** - Reference the locally saved images, never hotlink to the original site.
6. **Responsive** - Every section must look good on desktop (1280px+). Mobile is a bonus but not required unless I ask.

### Quality Bar

- Would a professional designer approve this? If not, iterate.
- Does it load fast? No unnecessary client components, no layout shift.
- Is the HTML semantic? Proper heading levels, landmark elements, alt text.
- Does it feel unique to the brand? Not a generic template.
- Run `pnpm lint` and `pnpm tsc --noEmit` after completing each page. Fix all errors.
