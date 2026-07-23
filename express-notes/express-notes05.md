# Express.js Learning Notes — Part 5

Templates: wrapping article content in a proper HTML page shell using EJS.

Continues from Part 4, where every article page was a raw HTML fragment — `<h1>` and `<p>` tags with no `<html>`, no `<head>`, no navigation, no styling.

---

## 1. What Was Missing From the Raw Pages

Viewing page source on `/articles/warfarin` (Ctrl+U in the browser) showed the exact string Express sent — just the article body:

```html
<h1>Warfarin</h1>
<p>Warfarin is a vitamin K antagonist...</p>
<ul>...</ul>
```

A real webpage needs a **shell** around that content:

```html
<!DOCTYPE html>                                   ← declares HTML5
<html lang="en">                                  ← language (a11y, SEO)
<head>
  <meta charset="utf-8">                          ← Chinese chars, μ, ±, etc.
  <meta name="viewport" ...>                      ← mobile responsiveness
  <title>Warfarin</title>                         ← browser tab title
  <link rel="stylesheet" href="/style.css">       ← CSS
</head>
<body>
  <header>...site nav...</header>
  <main>...ARTICLE CONTENT HERE...</main>
  <footer>...</footer>
</body>
</html>
```

Especially critical for bilingual clinical content: **without `<meta charset="utf-8">`, Chinese characters and special symbols render as garbage.**

---

## 2. The Pattern: One Thing Varies, Everything Else Repeats

Compare the warfarin page and the amiodarone page. Nearly the entire HTML shell is identical. Only two things change:

- The `<title>` value ("Warfarin" vs "Amiodarone")
- The content inside `<main>`

Same pattern from route parameters — variable content, repeating structure — and the same lesson applies: **there's a tool for it**.

---

## 3. What a Template Engine Does

A template is a **fill-in-the-blank HTML file**. Write the shell once, mark the blanks, and let a template engine fill them in per request.

```
┌─────────────────────────────────────┐
│ template file (views/article.ejs)   │
│                                     │
│ <title>{{ TITLE }}</title>          │  ← blank
│ <main>{{ ARTICLE_BODY }}</main>     │  ← blank
└─────────────────────────────────────┘
              ↓
    fill blanks per request
              ↓
    complete HTML sent to browser
```

Same idea as template literals from Part 3 (`` `articles/${slug}.md` ``), just at whole-file scale instead of one-string scale.

**Pharmacy analogy:** it's the difference between hand-writing every prescription label vs. using pre-printed labels with blanks for `Patient Name`, `Drug`, `Dose`. The label design stays constant. Only the blanks change.

---

## 4. Choice of Template Engine

Popular options for Express:

| Engine | Syntax | Notes |
| ------ | ------ | ----- |
| **EJS** | HTML with `<%= %>` | Easiest — looks like normal HTML with tiny JS bits |
| **Handlebars** | HTML with `{{ }}` | Cleaner, stricter; used in MedPharm Hub |
| **Pug** | Indented, no closing tags | Completely different syntax |

**EJS** picked here for the gentlest on-ramp. Handlebars concepts transfer directly once EJS is understood.

---

## 5. Setup — Three Small Steps

### Step 1: Install EJS as a runtime dependency

```bash
npm install ejs
```

**Not** `--save-dev`. The template engine has to run on every request on the live server.

Mental test: *"Does the live app need this to serve users?"* Yes → `dependencies`.

| Package | Where | Why |
| ------- | ----- | --- |
| ejs | dependencies | Renders every page for every request |
| jest | devDependencies | Only during development |
| nodemon | devDependencies | Only for local auto-restart |

### Step 2: Create a `views/` folder

Express looks for templates in a folder called `views/` at the project root. Convention — override possible but never worth it.

```
express-app/
├── app.js
├── server.js
├── articles/
│   ├── test.md
│   └── warfarin.md
└── views/               ← new
    └── article.ejs      ← template file
```

### Step 3: Tell Express to use EJS

One line in `app.js`, right after `const app = express();`:

```js
app.set('view engine', 'ejs');
```

Two effects packed in:

1. Any call to `res.render('name', ...)` uses the EJS engine
2. Express looks for `views/name.ejs` automatically

Note: **no `require('ejs')` needed.** Express handles that internally as soon as `app.set('view engine', 'ejs')` runs.

---

## 6. First Template — `views/article.ejs`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><%= title %></title>
</head>
<body>
  <header>
    <h1>My Clinical Reference Site</h1>
    <nav>
      <a href="/">Home</a>
    </nav>
  </header>

  <main>
    <%- body %>
  </main>

  <footer>
    <p>© 2026 Evelyn</p>
  </footer>
</body>
</html>
```

Almost entirely normal HTML. Only two non-HTML markers: `<%= title %>` and `<%- body %>`.

---

## 7. The `<%= %>` vs `<%- %>` Distinction (Critical)

Nothing to do with line count. The difference is **how EJS treats HTML characters inside the value**.

### `<%= value %>` — escape HTML (safe default)

Treats the value as **plain text**. Any `<`, `>`, `&` characters get escaped into `&lt;`, `&gt;`, `&amp;` so the browser shows them as literal characters, not HTML.

### `<%- value %>` — insert as raw HTML

Trusts the value. Inserts it into the page **as HTML tags**. Any `<h1>` becomes an actual heading.

### Which to use — decision rule

Ask: *"is the value I'm plugging in supposed to be plain text or HTML?"*

| Value | Choice | Why |
| ----- | ------ | --- |
| Article title (`"Warfarin"`) | `<%= %>` | Plain text |
| `marked()` output (has `<h1>`, `<p>`) | `<%- %>` | Trusted HTML from own Markdown |
| User's name from a form | `<%= %>` | Never trust user input |
| A publication date string | `<%= %>` | Plain text |
| An HTML fragment built in code | `<%- %>` | Trusted HTML |

### The security angle — XSS

`<%= %>` is the **safe default**. If a value came from user input containing:

```
<script>alert('hacked')</script>
```

- `<%= %>` renders it as harmless text
- `<%- %>` executes it as a real script

That's an XSS (cross-site scripting) attack. Using `<%- %>` on untrusted input is a real security bug.

Rule of thumb:

> **Default to `<%= %>`. Use `<%- %>` only when the value is HTML you generated yourself (or otherwise fully trust).**

`marked()` output on our own `.md` files is trusted → `<%- body %>` is fine.

---

## 8. Wiring the Route to the Template

Old route (raw send):

```js
res.send(html);
```

New route (using the template):

```js
res.render('article', {
  title: articleName,
  body: html
});
```

### `res.render(...)` — the bridge

```js
res.render('template-name', { data-object });
```

- **`'template-name'`** — filename **without** `.ejs`. Express appends `.ejs` and looks in `views/`.
- **`{ data-object }`** — plain JS object. Each key becomes a variable inside the template.

### How the data crosses over

```
        route (app.js)                     template (views/article.ejs)
        ─────────────                     ────────────────────────────
        res.render('article', {           <title><%= title %></title>
          title: articleName,   ─────→    <main><%- body %></main>
          body: html
        });
```

- `title: articleName` in the route → `<%= title %>` in the template picks up `articleName`'s value
- `body: html` in the route → `<%- body %>` in the template picks up `html`'s value

**The key name in the object is what becomes the variable name in the template.** The value can be any JS expression — a variable, a literal, a function call, whatever.

---

## 9. Common Confusion — EJS Syntax vs JS Syntax

Two different files, two different languages:

| File | Language | Role |
| ---- | -------- | ---- |
| `views/article.ejs` | HTML + EJS placeholders | Defines *shape* of page |
| `app.js` | Plain JavaScript | Defines *values* to fill blanks |

**`<%= %>` and `<%- %>` only exist inside `.ejs` files.**

Wrong:

```js
// in app.js — INVALID JavaScript
res.render('article', {
  title: <%= title %>,   // ❌ EJS syntax has no meaning here
  body: <%- body %>      // ❌ same
});
```

Right:

```js
// in app.js — plain JS variables passed in
res.render('article', {
  title: articleName,    // ✅ JS variable
  body: html             // ✅ JS variable
});
```

The variables `title` and `body` don't exist in `app.js`. They're names that only make sense inside the template — invented by the object keys in the `res.render()` call.

---

## 10. Full Route — With Template

```js
app.get('/articles/:articleName', (req, res) => {
  const { articleName } = req.params;

  try {
    const contents = fs.readFileSync(`articles/${articleName}.md`, 'utf8');
    const html = marked(contents);
    res.render('article', {
      title: articleName,
      body: html
    });
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.status(404).send('Article not found');
    } else {
      res.status(500).send('Something went wrong');
    }
  }
});
```

Only the *success* path changed from Part 4. Error branches still use `res.send()`. Later, error pages can also use `res.render()` with a `404.ejs` and `500.ejs` template — same pattern.

---

## 11. What This Buys

Compared to before:

| Before | After |
| ------ | ----- |
| Bare `<h1>` and `<p>` fragment | Full `<!DOCTYPE html>` page |
| No browser tab title | Real `<title>` per article |
| No navigation | Header + nav on every page |
| No footer | Consistent footer |
| No mobile viewport meta | Mobile-friendly meta present |
| No language declaration | `lang="en"` for accessibility/SEO |
| Would break on Chinese chars | UTF-8 declared |

Adding a new article — say `articles/amiodarone.md` — now automatically inherits the full shell. Zero template changes needed.

**Content, code, and layout are now three separate concerns:**

- Content lives in `articles/*.md`
- Layout lives in `views/*.ejs`
- Route logic lives in `app.js`

Each can change independently.

---

## 12. Small Rough Edge

`title: articleName` passes the URL slug directly, so the browser tab shows `warfarin` in lowercase instead of `Warfarin`.

Fix (for later — not critical yet):

```js
const title = articleName.charAt(0).toUpperCase() + articleName.slice(1);
res.render('article', { title, body: html });
```

Or better: store a proper title in the Markdown file's front matter and parse it out. That's a later lesson.

---

## Cheat Sheet

### Setup

```bash
npm install ejs
```

```js
app.set('view engine', 'ejs');
```

Folder: `views/` at project root, files with `.ejs` extension.

### EJS syntax

| Tag | Meaning |
| --- | ------- |
| `<%= value %>` | Insert value as escaped plain text (safe default) |
| `<%- value %>` | Insert value as raw HTML (trusted only) |
| `<% code %>` | Run JS code with no output (loops, conditionals — later) |

### Rendering from a route

```js
res.render('template-name', {
  someKey: someJsValue,
  anotherKey: anotherJsValue
});
```

- `'template-name'` → `views/template-name.ejs`
- Object keys become variable names in the template
- Object values can be any JS expression

### Boilerplate page shell

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><%= title %></title>
</head>
<body>
  <%- body %>
</body>
</html>
```

---

## Key Principles Learned

1. **A template is a fill-in-the-blank HTML file.** Same conceptual pattern as template literals, at whole-file scale.
2. **`views/` is the conventional folder** for templates in Express. `.ejs` is the file extension for EJS templates.
3. **`app.set('view engine', 'ejs')`** replaces `require('ejs')` — Express handles the import.
4. **`res.render('name', { data })`** is the bridge from route to template. Keys in the data object become variables in the template.
5. **`<%= %>` escapes; `<%- %>` doesn't.** Default to escaping. Use raw only for trusted HTML.
6. **EJS syntax only lives inside `.ejs` files.** JS in `.js` files, EJS in `.ejs` files — never mix.
7. **Separation of concerns:** content in `.md` files, layout in `.ejs` files, logic in `.js` files.

---

## The Question Still Lurking

The page has structure now, but no *style*. All fonts are browser defaults. No colors, no spacing choices, no readable line-widths.

The next natural step is **CSS**. But before writing any styles, there's a very common beginner mistake: **Express doesn't serve CSS files by default.** You need a piece of middleware called `express.static` to make `/style.css` reachable from the browser.

That's the next lesson: serving static files, then actually writing CSS.
