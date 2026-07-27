# Express.js Learning Notes — Part 6

Static files and CSS: making the article page look like a real website using `express.static` and hand-written CSS.

Continues from Part 5, where the page had proper HTML structure (`<header>`, `<main>`, `<footer>`) but no styling — bare browser defaults across the full width of the screen.

---

## 1. The Surprise: Express Doesn't Serve CSS by Default

First attempt: add `<link rel="stylesheet" href="/style.css">` to `views/article.ejs`, drop a `style.css` at the project root, refresh the browser.

Result: **nothing changes.** DevTools → Network tab shows `style.css` request returns **404 Not Found**.

### Why

Express's rule is dead simple:

> **If you didn't write a route for a URL, Express doesn't respond to it.**

Look at the routes defined in `app.js`:

```js
app.get('/articles/:articleName', ...)
```

That's the whole list. When the browser asks for `/style.css`, Express checks its routes:

- `/articles/:articleName` — nope
- ...end of list

Express returns 404. It does **not** automatically look at files in the project folder. It has no idea `style.css` exists.

### Contrast with other servers

Apache, nginx, GitHub Pages: put a file in the folder, it's automatically served. That behavior is called *serving static files*.

Express is different: it's a framework for *building custom logic*, so it only does what you tell it to. To serve static files, you have to opt in explicitly.

**Pharmacy analogy:** Express is a dispensing counter that only serves prescriptions on today's list. Apache is a self-serve shelf — anything on the shelf, take it. Neither is better; they're different models.

---

## 2. The Fix: `express.static` Middleware

Express ships with a built-in helper for exactly this. One line in `app.js`:

```js
app.use(express.static('public'));
```

Where to put it: right after `app.set('view engine', 'ejs')`, before your routes.

### What each part does

| Piece | Meaning |
| --- | --- |
| `app.use(...)` | *"Run this on every incoming request."* Attaches middleware. |
| `express.static('public')` | A helper that returns a middleware function tailored to the `public/` folder. |

For every request, `express.static` does:

1. Take the requested URL (e.g. `/style.css`)
2. Look for a matching file inside `public/` (i.e. `public/style.css`)
3. If found → send it. If not → do nothing, let other routes handle it.

### A primer: `app.get`, `app.set`, `app.use`

Three Express methods use plain English words that mean roughly what they mean in everyday life. Worth naming them all now before the notes assume they're familiar.

#### `app.get(...)` — respond to a "GET" request

When your browser visits a URL, it sends a **GET request** — literally, *"hey server, please **get** me this page."*

`get` here comes from **HTTP** — the language browsers and servers speak. HTTP has several verbs:

| HTTP verb | What it means | Everyday example |
| --- | --- | --- |
| **GET** | "Give me this page" | Typing a URL in your browser |
| **POST** | "Here's some data — save it" | Submitting a form |
| **PUT** | "Replace this thing with this new version" | Editing a saved item |
| **DELETE** | "Remove this thing" | Deleting a saved item |

`app.get('/warfarin', handler)` reads as: *"When someone GETs `/warfarin`, run this handler."*

Only GET has been used so far because articles are only being *read*. A form for submitting new articles would use `app.post(...)`.

#### `app.set(...)` — configure a setting

`set` means *"put this value somewhere for later."* Express has an internal notebook of settings; `app.set(name, value)` writes into that notebook.

`app.set('view engine', 'ejs')` reads as: *"Set the `view engine` setting to `'ejs'`."*

Later, when Express needs to render a template, it looks up the `view engine` setting, finds `'ejs'`, and uses EJS to fill in the blanks. That's how one line at the top of `app.js` in Part 5 made `res.render(...)` know to use EJS.

*(Side note: `app.get(name)` without a URL also exists — it *reads* a setting from that notebook. Same word, different job. Distinguished by whether the first argument is a URL path (starts with `/`) or a plain setting name. Ignore it for now.)*

#### `app.use(...)` — attach something to every request

`use` means *"apply this to everything."* `app.use(...)` reads as: *"Use this thing as middleware — run it on every incoming request."*

No URL to match. It runs on all requests, no matter the URL.

That's exactly what `express.static` needs. Every request could potentially be for a static file (`/style.css`, `/images/foo.png`, and so on), so `express.static` has to get a look at every request to check if there's a matching file.

The thing you pass to `app.use(...)` is called **middleware** — a function that processes requests. `express.static` is middleware. So are logging, authentication, and request-body parsing (all future lessons).

#### Pharmacy analogy for all three

- **`app.get('/warfarin', ...)`** — a specific counter: *"When someone asks for warfarin, do this."* One counter, one drug.
- **`app.set('opening hours', '9-5')`** — writing on the whiteboard behind the desk. A setting that affects how the whole desk operates.
- **`app.use(scanEveryPrescription)`** — a security step at the door. Applies to every visitor, no matter what they're there for.

Three different jobs, three different words, all on the same `app` object.

---

## 3. The "Invisible Folder" Rule

Trickiest part of `express.static` to internalize:

> **The folder name is NOT part of the URL.**

- File on disk: `public/style.css`
- URL to access it: `/style.css` (NOT `/public/style.css`)

The `public/` folder is essentially invisible from the browser's perspective — it just serves as the *root* of your public files.

### Examples

| File on disk | URL |
| --- | --- |
| `public/style.css` | `/style.css` |
| `public/main.css` | `/main.css` |
| `public/fonts/serif.woff2` | `/fonts/serif.woff2` |
| `public/images/warfarin-structure.svg` | `/images/warfarin-structure.svg` |

The internal path *inside* `public/` is preserved; only the `public/` prefix disappears.

---

## 4. The 304 Status Code

After wiring `express.static`, DevTools shows `style.css` returning **304 Not Modified** on subsequent loads.

### What 304 means

`304 Not Modified` is a *success* response, just smarter:

> *"You asked me for style.css. I remember you already downloaded it recently and it hasn't changed. Use your cached copy."*

Browsers cache static files (CSS, images, JS) so they don't redownload on every page visit:

- **File unchanged** → server sends `304` with no body. Browser uses cache.
- **File changed** → server sends `200` with the new file.

Both mean "here's your CSS." `304` is just faster.

**Pharmacy analogy:** you asked for warfarin refills. Instead of packaging a fresh bottle, the pharmacist checks: *"You picked up the same prescription yesterday, it hasn't changed. Just use the bottle you already have."*

### The `Ctrl+Shift+R` trick

Regular refresh (`F5`) uses the cache. Hard refresh (`Ctrl+Shift+R`) forces a full re-download. Useful when tweaking CSS — you want to see the new file, not the cached one.

---

## 5. Folder Structure After Step 6

```
express-app/
├── app.js
├── server.js
├── articles/
│   ├── test.md
│   └── warfarin.md
├── views/
│   └── article.ejs
└── public/                ← new
    └── style.css          ← new
```

`public/` is the standard name for static assets. Every Express project uses it.

---

## 6. The CSS — Written in Layers

Rather than one big stylesheet dropped in at once, the styling was built up in layers, refreshing at each step. This makes it obvious what each rule does.

### Reset

```css
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
}
```

- **`box-sizing: border-box`** on everything — makes padding and borders count *inside* the width. Predictable sizing math. Every professional codebase does this.
- **Reset body margins** — browsers add small default margins. Removing them gives full control.

### Typography

```css
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 17px;
  line-height: 1.6;
  color: #222;
}
```

- **System font stack** — uses the OS default UI font (San Francisco on macOS, Segoe UI on Windows, Roboto on Android). Native look everywhere, zero font files loaded.
- **`font-size: 17px`** — slightly bigger than the 16px default. Comfortable for long-form reading. Medium uses 21px.
- **`line-height: 1.6`** — spacing between lines. Default ~1.2 is too cramped. 1.5–1.7 is the sweet spot for articles.
- **`color: #222`** — near-black, not pure black. Pure black on white is too much contrast — tiring to read.

### Content container

```css
main {
  max-width: 720px;
  margin: 2rem auto;
  padding: 0 1.5rem;
}
```

- **`max-width: 720px`** — articles read best at ~60–75 characters per line. Never let text stretch beyond that.
- **`margin: 2rem auto`** — `2rem` top/bottom, `auto` left/right. `auto` is the classic centering trick.
- **`padding: 0 1.5rem`** — inside padding, prevents text hugging screen edge on mobile.

### Matching header and footer

```css
header,
footer {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 1.5rem;
}
```

- **Comma-separated selector** — applies the rule to both `header` AND `footer`. Avoids repeating the same rule twice.

### Header polish

```css
header {
  padding-top: 1.5rem;
  padding-bottom: 1rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid #e5e5e5;
}

.site-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
  color: #222;
}

header nav a {
  color: #666;
  font-size: 0.95rem;
  text-decoration: none;
}

header nav a:hover {
  color: #222;
  text-decoration: underline;
}
```

- **Border-bottom** on the header — single 1px line, huge visual impact. Separates header from article.
- **`.site-title` class** — replaces the old `header h1` rule (see Section 8 for why).
- **`header nav a`** — descendant selector. Targets links *inside nav inside header*. Doesn't affect links elsewhere.
- **`:hover`** — pseudo-class. Applies styles only when the mouse is over the element.

### Article links

```css
main a {
  color: #0066cc;
  text-decoration: none;
}

main a:hover {
  text-decoration: underline;
}
```

Softer than default browser blue. Underline only on hover — modern convention.

---

## 7. CSS Units — `px` vs `rem`

| Unit | Meaning | Use for |
| --- | --- | --- |
| `px` | Absolute pixels. Doesn't scale. | Fine details (borders, exact font sizes) |
| `rem` | Relative to the root font-size (usually 16px). `1rem = 16px`, `2rem = 32px`. | Spacing (margin, padding, gap) |

Rule of thumb: **`rem` for spacing, `px` for details.** Using `rem` for spacing lets everything scale together if the base font-size ever changes (accessibility, user preferences).

---

## 8. Semantic Fix: The Two-`<h1>` Problem

The template had `<h1>My Clinical Reference Site</h1>` in the header. Markdown-generated content also produced `<h1>Warfarin</h1>` inside `<main>`. Result: two `<h1>` elements on the page.

### Why this matters

- **Screen readers** use `<h1>` as the page's main landmark. Two `<h1>`s → which one is the page's topic?
- **Google** treats `<h1>` as the strongest SEO signal. Every article saying "My Clinical Reference Site" as the top signal is bad for search.
- **Semantically**, a page should have exactly one `<h1>` that describes what *this specific page* is about.

### The fix

In `views/article.ejs`:

```html
<!-- OLD -->
<header>
  <h1>My Clinical Reference Site</h1>
  ...
</header>

<!-- NEW -->
<header>
  <p class="site-title">My Clinical Reference Site</p>
  ...
</header>
```

In CSS, replace `header h1 { ... }` with `.site-title { ... }` and add `font-weight: 700` (a `<p>` isn't bold by default).

### Element selectors vs class selectors

New syntax worth naming:

| Selector | Targets |
| --- | --- |
| `p` | Every `<p>` element |
| `.site-title` | Every element with `class="site-title"` |
| `p.site-title` | Only `<p>` elements with that class |

The `.` prefix means "class." Different from element selectors like `header`, `p`, `h1`.

### Verifying in DevTools

Elements panel → `Ctrl+F` → search for `<h1>`. Should find exactly one: `<h1>Warfarin</h1>`.

---

## 9. Descendant Selectors and Scoping

Compared to just `nav a` or `a`:

| Selector | Targets |
| --- | --- |
| `a` | Every link on the page |
| `nav a` | Every link inside any nav |
| `header nav a` | Only links inside the header's nav |
| `header a` | Every link in the header (whether in nav or not) |

Rule: **be as specific as you need to be, but no more.** Too narrow = harder to reuse. Too broad = unwanted side effects.

---

## 10. DevTools Deep Dive

DevTools panel showed the browser's built-in `<h1>` styles:

```
h1 {
  display: block;
  font-size: 2em;
  margin-block-start: 0.67em;
  ...
}
```

Labelled `user agent stylesheet` — every browser ships with an invisible CSS file called the *user agent stylesheet*. It's why unstyled HTML doesn't look totally blank: `<h1>` is big and bold, `<p>` has margins, etc. Your CSS layers on top of it.

### Debugging with the Styles panel

- Rules with a **strikethrough** are overridden by a more specific rule elsewhere
- The "Inherited from" section shows rules cascaded down from parent elements
- Toggling checkboxes disables individual properties temporarily

Superpower: if a style isn't applying, DevTools shows you exactly *what won and what lost*.

### Searching the DOM

`Ctrl+F` inside the Elements panel searches the current DOM. Bottom-right shows `X of Y` matches. Fastest way to verify element counts (like "is there really only one h1?").

---

## 11. Final `app.js` Additions

Two additions from Part 6:

```js
const express = require('express');
const fs = require('fs');
const { marked } = require('marked');
const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));   // ← new

// routes below...
```

That's it. One middleware line unlocks all static file serving forever — for CSS, images, JS, fonts, PDFs, anything you drop into `public/`.

---

## Cheat Sheet

### Setup

```js
app.use(express.static('public'));
```

### Folder convention

`public/` can hold any static file — the folder name is invisible in the URL, and Express serves whatever's inside.

```
public/
├── style.css
└── images/
    └── logo.png
```

(You can also add subfolders like `fonts/` for web fonts, `pdfs/` for downloadable documents, or `scripts/` for client-side JavaScript — code that runs *in the browser* rather than on the server. None of those apply to this project yet; the point is just that `public/` is where all static assets live.)

### URL mapping

| File on disk | URL |
| --- | --- |
| `public/style.css` | `/style.css` |
| `public/images/logo.png` | `/images/logo.png` |

### CSS reset baseline

```css
* { box-sizing: border-box; }
body { margin: 0; padding: 0; }
```

### Article-friendly typography

```css
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 17px;
  line-height: 1.6;
  color: #222;
}

main {
  max-width: 720px;
  margin: 2rem auto;
  padding: 0 1.5rem;
}
```

### Common selectors

| Syntax | Meaning |
| --- | --- |
| `p` | All `<p>` elements |
| `.class-name` | All elements with that class |
| `header nav a` | Descendant selector — narrow scope |
| `a, button` | Comma — apply to multiple selectors |
| `a:hover` | Pseudo-class — on mouse hover |

### HTTP status codes seen this session

| Code | Meaning |
| --- | --- |
| 200 | OK — file sent |
| 304 | Not Modified — use cache |
| 404 | Not Found — no route matched |

---

## Key Principles Learned

1. **Express serves nothing you don't tell it to serve.** No implicit file serving. Every URL needs a route or middleware match.
2. **`express.static(folder)` is the opt-in for serving files.** One line unlocks any file inside that folder.
3. **The folder name is invisible in the URL.** `public/style.css` is served at `/style.css`.
4. **304 is a success code, not an error.** It means "use your cached copy."
5. **`rem` for spacing, `px` for details.** Consistent scaling that respects user font-size preferences.
6. **One `<h1>` per page.** Screen readers and search engines both depend on this.
7. **`.class-name` and element selectors are different things.** Element = every tag of that type. Class = every element with that attribute.
8. **Descendant selectors scope styles.** `header nav a` is safer than `nav a` is safer than `a`.
9. **DevTools shows what won and what lost.** Strikethrough = overridden. Read it to debug CSS specificity.

---

## The Question Still Lurking

Now that `express.static` is wired up, adding images is nearly free — same mechanism, different file type. Drop a PNG in `public/images/`, reference it in Markdown as `![alt](/images/foo.png)`, done.

But there are a few Markdown-specific things worth knowing:

- Where to store images (per-article folders vs. one big `images/` folder)
- Absolute vs. relative paths (absolute is safer with Express)
- Alt text — genuinely important for clinical diagrams
- Sizing images without breaking the article's `max-width`
- PNG/JPG vs. SVG for different content types (photos vs. line diagrams)

That's step 7.
