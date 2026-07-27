# Express.js Learning Roadmap

A living document tracking Evelyn's Express learning journey — what's done, what's next, and why the order was chosen.

**Last updated:** July 26, 2026 (after Part 5 — EJS templates)

---

## The learning approach

- **One concept at a time.** Never introduce a second new idea until the first one is solid.
- **Recognition → application.** Multiple choice / fill-in-the-blank before open-ended coding.
- **Test predictions before checking.** "What do you think will happen?" builds intuition.
- **Notes as we go.** Each completed topic gets a `express-notesXX.md` reference file.
- **No stack traces skipped.** Errors are lessons; we read them out loud together.

---

## Progress so far

| # | Topic | Note file | Status |
| --- | ------------------------------------------- | -------------------- | ------------ |
| 1 | Node/Express setup, npm scripts, testing tools | `express-notes01.md` | ✅ Complete |
| 2 | Serve articles from files (`fs`, `marked`) | `express-notes02.md` | ✅ Complete |
| 3 | Route parameters (`req.params`, `:slug`) | `express-notes03.md` | ✅ Complete |
| 4 | Error handling (`try`/`catch`, HTTP status codes) | `express-notes04.md` | ✅ Complete |
| 5 | EJS templates (`res.render`, `<%= %>`, `<%- %>`) | `express-notes05.md` | ✅ Complete |

**Current state of the app:**
- `/articles/:articleName` reads any `.md` file, converts to HTML via `marked`, wraps in EJS shell
- Renders proper `<!DOCTYPE html>` page with header, nav, footer
- Handles 404 (missing article) and 500 (other errors) correctly
- No CSS yet — pages are unstyled but structurally sound

---

## Upcoming topics (in order)

### 6. `express.static` + CSS

**Why here:** Pages have proper structure but no visual style. CSS is the biggest visible payoff for the least conceptual work. Also the foundation for **all** static assets — CSS, images, JS, fonts, PDFs.

**What we'll cover:**
- Why Express doesn't serve `/style.css` by default (routes are explicit)
- The `express.static` middleware — the *"serve everything in this folder as-is"* switch
- Folder conventions (`public/` at root)
- Wiring `<link rel="stylesheet" href="/style.css">` in the EJS template
- Writing basic CSS: readable typography, article max-width, header/nav styling
- Mobile-friendly defaults

**Note file:** `express-notes06.md`

---

### 7. Images in articles

**Why here:** Uses the same `express.static` mechanism as CSS — natural extension. Once static serving works, images are almost free.

**What we'll cover:**
- Markdown image syntax: `![alt text](/images/foo.png)`
- Where images live in the project (`public/images/` alongside CSS)
- Absolute vs relative paths (absolute is safer with Express)
- Alt text — accessibility for clinical diagrams (esp. important for the domain)
- Sizing options: HTML `<img width="...">` vs CSS classes vs `marked` extensions
- Format choice: PNG/JPG for photos and screenshots, SVG for diagrams and ECG traces
- When inline React SVG components would be a better fit (spoiler: not for Markdown Express sites)

**Note file:** `express-notes07.md`

---

### 8. Index page (list all articles)

**Why here:** Now that CSS exists, the index page will look good instead of being a bare list of links. Also introduces `fs.readdirSync` — reading a *folder* instead of a single file, which is a small conceptual step up.

**What we'll cover:**
- `fs.readdirSync('articles/')` — list all files in a folder
- Filtering to only `.md` files
- Stripping the `.md` extension to get slugs
- Building a list of links in the EJS template
- Using EJS `<% for %>` loops (first time using EJS logic tags, not just placeholders)
- Route at `/` that renders the index

**Note file:** `express-notes08.md`

---

### 9. Handlebars conversion

**Why here:** MedPharm Hub uses Handlebars. Timing: whenever MedPharm Hub work becomes active, OR after finishing the meaty EJS features (partials, layouts) — whichever comes first.

**What we'll cover:**
- Concept mapping: EJS → Handlebars is punctuation swaps for the same ideas
- Install and configure `express-handlebars`
- Syntax comparison side-by-side (see cheat sheet below)
- Read through MedPharm Hub's existing templates together
- Partials and layouts — where Handlebars is a bit stricter than EJS

**Not a full course** — a conversion lesson. Likely 1–2 sessions total.

**Note file:** `express-notes09.md`

---

### 10. Jest tests

**Why last:** Testing pays off when the app is stable. Writing tests too early means rewriting them every session. After steps 6–8, there's a real interface to test (index page, article page, 404, 500).

**What we'll cover:**
- Refresher on the `supertest` + `jest` setup from Part 1
- Testing the happy path: `/articles/warfarin` returns 200 + expected content
- Testing the 404 path: `/articles/does-not-exist` returns 404
- Testing the 500 path (harder — need to simulate a non-ENOENT error)
- Testing the index page: 200 + a link to each existing article
- File organization: one test file per route file, or one big `app.test.js`?

**Note file:** `express-notes10.md`

---

## Topics deliberately deferred

These are important but not right now. Listed so they're not forgotten.

| Topic | Why deferred | When to revisit |
| --- | --- | --- |
| **Async `fs.readFile` and Promises** | `readFileSync` is fine for learning. Async makes error handling more complex. | After Jest tests are comfortable |
| **Middleware fundamentals** | Currently we've used middleware implicitly (`express.static`, EJS). Understanding the `(req, res, next)` pattern deserves a dedicated lesson. | Before adding auth or logging |
| **Splitting routes with `express.Router()`** | Only worth it when there are 10+ routes. | When the app has a second content type beyond articles |
| **Front-matter parsing** | Article metadata (title, date, tags) in `.md` files. `marked` alone can't do this — need `gray-matter`. | When the index page needs sorting or grouping |
| **Deployment (Vercel serverless functions)** | Different from a long-running Express server; needs its own lesson. | When the app is feature-complete enough to actually deploy |
| **Authentication** | Big topic. Not needed for a public clinical reference site. | If Antibiotics Guide backend needs private pages |
| **Session/cookies** | Comes with auth. | Same as auth |
| **Databases (SQL or NoSQL)** | Files on disk are enough for now. Would matter for user-generated content. | If the app ever accepts user input |
| **Environment variables (`dotenv`)** | Matters for API keys and deployment configs. | Before wiring up Notion API for Antibiotics Guide |
| **Notion API integration** | The actual payoff for Antibiotics Guide backend. | After steps 6–10 are solid — the Express pattern is transferable |

---

## Handlebars quick reference (for future step 9)

Not for use yet — but noting here so it's easy to grab later.

| Concept | EJS | Handlebars |
| --- | --- | --- |
| Escaped output | `<%= title %>` | `{{title}}` |
| Raw HTML output | `<%- body %>` | `{{{body}}}` (triple braces) |
| Loop | `<% for (const a of articles) { %>...<% } %>` | `{{#each articles}}...{{/each}}` |
| Conditional | `<% if (x) { %>...<% } %>` | `{{#if x}}...{{/if}}` |
| Setup | `app.set('view engine', 'ejs')` | `express-handlebars` package + config |
| Partials | `<%- include('nav') %>` | `{{> nav}}` |
| Comments | `<%# ... %>` | `{{! ... }}` |

---

## Guiding principles across the roadmap

1. **Concepts before syntax.** Every lesson should leave a *mental model*, not just a snippet to memorize.
2. **Small edits, immediate feedback.** Save file → refresh browser → see result. That loop stays fast.
3. **Real project relevance.** Every topic should map to at least one of Evelyn's real projects (MedPharm Hub, Antibiotics Guide, Little Path, TTB Website).
4. **Analogies grounded in pharmacy/hospital work** consistently land — keep using them.
5. **Notes are portable.** Each `express-notesXX.md` should stand alone and be Notion-pasteable.
6. **Never build everything without asking.** Iterate step by step with confirmation.

---

## When picking this back up

Say *"continue Express — step N"* where N is the next unchecked topic, or just *"what's next in Express?"* and I'll re-orient from this roadmap.
