# Express.js Learning Notes — Part 3

One route that serves *any* article, using route parameters (`:placeholder`).

Continues from Part 2, where we had a working `/test` route that read one hardcoded file (`articles/test.md`).

---

## 1. The Problem Left Over From Part 2

The `/test` route works, but it's welded to one specific file:

```js
app.get('/test', (req, res) => {
  const contents = fs.readFileSync('articles/test.md', 'utf8');
  const html = marked(contents);
  res.send(html);
});
```

If we want a second article — say `articles/warfarin.md` — the obvious move is to copy the route and change the path:

```js
app.get('/warfarin', (req, res) => {
  const contents = fs.readFileSync('articles/warfarin.md', 'utf8');
  res.send(marked(contents));
});
```

For 10 articles, that's 10 nearly-identical routes. **What changes:** the article name (appears twice per route — in the URL and in the filename). **What stays the same:** literally everything else.

That's a **pattern** — one thing varies, everything else repeats — and any time you spot that, there's a tool for it.

---

## 2. Route Parameters — The `:placeholder` Syntax

Put a colon in front of a name in the URL, and Express treats that part as a **placeholder** that captures whatever the user typed:

```js
app.get('/articles/:articleName', (req, res) => {
  // whatever the user typed after /articles/ is now available
});
```

| Request URL              | Captured value       |
| ------------------------ | -------------------- |
| `GET /articles/warfarin` | `"warfarin"`         |
| `GET /articles/aspirin`  | `"aspirin"`          |
| `GET /articles/anything` | `"anything"`         |

The name after `:` is a label *you* choose. It could be `:name`, `:slug`, `:articleName` — Express just uses it as the key to look the value up later.

**Pharmacy analogy:** it's like a barcode scanner at the pickup counter. The scanner (`/articles/:articleName`) doesn't care *which* prescription is being picked up. It just captures the barcode and looks up the right bag. One scanner handles every patient, instead of a separate scanner for each patient's name.

---

## 3. Understanding `req` — the request object

Every time the browser sends a request, Express hands your handler an object called `req`. It's a big bag of information about the incoming request — headers, cookies, method, URL, and more.

Express organizes `req` into labeled compartments:

| Compartment       | What's inside                                       |
| ----------------- | --------------------------------------------------- |
| `req.method`      | `"GET"`, `"POST"`, etc.                             |
| `req.url`         | The raw URL that was requested                      |
| `req.headers`     | User-Agent, cookies, content-type, etc.             |
| `req.query`       | Anything after `?` in the URL (`?foo=bar`)          |
| **`req.params`**  | **The `:placeholder` values from the route**        |
| `req.body`        | Data sent in a POST request                         |

For serving articles, only `req.params` matters right now.

---

## 4. What `req.params` Actually Looks Like

`req.params` is itself a small object with **one property per `:placeholder`** in the route.

### One placeholder

Route: `app.get('/articles/:articleName', ...)`
Request: `/articles/warfarin`

```js
req.params = {
  articleName: 'warfarin'
}
```

### Two placeholders

Route: `app.get('/articles/:category/:articleName', ...)`
Request: `/articles/cardiac/warfarin`

```js
req.params = {
  category: 'cardiac',
  articleName: 'warfarin'
}
```

**Express uses whatever name you wrote after each `:` as the key.** That's why the name matters — it becomes the key you use to look up the captured value.

---

## 5. Reading `req.params.articleName`

Read the dot-notation left to right, like following a path:

```
req       .params     .articleName
 ↓           ↓             ↓
the       the URL       the value
request    params      captured for
object    compartment  :articleName
```

In plain English: *"Look at the request. Go into its params compartment. Give me the value under the key articleName."*

For `/articles/warfarin` with route `/articles/:articleName`:

```js
req.params                 // → { articleName: 'warfarin' }
req.params.articleName     // → 'warfarin'
```

---

## 6. Rewriting the Route

Combining everything: reading the placeholder value + building the filename with a template literal.

```js
app.get('/articles/:articleName', (req, res) => {
  const articleName = req.params.articleName;
  const contents = fs.readFileSync(`articles/${articleName}.md`, 'utf8');
  const html = marked(contents);
  res.send(html);
});
```

Line by line:

1. Route pattern captures anything after `/articles/` into `req.params.articleName`
2. Extract the value into a local variable with a clear name
3. Build the file path with a template literal — `articles/<the-slug>.md`
4. Read, convert, send. Same three steps as before.

---

## 7. Why Extract to a Local Variable?

Both versions work identically:

```js
// Version A — inline
fs.readFileSync(`articles/${req.params.articleName}.md`, 'utf8');

// Version B — extracted
const articleName = req.params.articleName;
fs.readFileSync(`articles/${articleName}.md`, 'utf8');
```

**Version B is better** for two reasons:

1. **The name says what the value *is*, not where it *lives*.** `req.params.articleName` describes a location; `articleName` names a concept. Names read faster.
2. **Avoids repetition.** If the handler grows and uses the value 3–4 times, extracting once at the top keeps it clean.

This has a name: *"extract a variable to name a value."* A small refactor that experienced developers do reflexively.

---

## 8. The Destructuring Version (Optional Shortcut)

The same destructuring pattern from Part 2 (with `marked`) works here too:

```js
const { articleName } = req.params;
```

This is shorthand for `const articleName = req.params.articleName`. Works only when the variable name matches the property name — which is usually the case with route params.

Full route with destructuring:

```js
app.get('/articles/:articleName', (req, res) => {
  const { articleName } = req.params;
  const contents = fs.readFileSync(`articles/${articleName}.md`, 'utf8');
  const html = marked(contents);
  res.send(html);
});
```

Not required. Use whichever version reads more clearly *to you*.

---

## 9. Template Literals — Common Traps

While writing the file path, three easy mistakes:

### Trap 1: Using single or double quotes instead of backticks

```js
'articles/${articleName}.md'     // literal string — no substitution ❌
`articles/${articleName}.md`     // substituted at runtime            ✅
```

`${...}` only works inside **backticks**. Inside `'...'` or `"..."` it's just literal characters.

### Trap 2: Wrapping the variable in quotes inside `${...}`

```js
`articles/${'articleName'}.md`   // → "articles/articleName.md"        ❌
`articles/${`articleName`}.md`   // → "articles/articleName.md"        ❌
`articles/${articleName}.md`     // → "articles/warfarin.md"           ✅
```

Inside `${...}`, write the *variable* — bare, no quotes, no backticks. Otherwise it becomes a string literal instead of the value.

### Trap 3: Forgetting the slash between path pieces

```js
app.get('/articles:articleName', ...)     // ❌ no slash — URL would be /articles:articleName
app.get('/articles/:articleName', ...)    // ✅
```

---

## 10. Mental Model — Template Literal as Mad Lib

```js
`articles/${slug}.md`
         ↑
    fill this blank with the value of slug at runtime
```

The template is a **fixed sentence with a blank in it**. The `${...}` marks where the blank goes. At runtime, JavaScript fills in the blank with the variable's value.

Like a prescription label:

```
For patient: _____________
```

The template is printed once. Only the blank changes per patient.

---

## 11. What This Buys You

With route parameters, **one route handler serves an unlimited number of articles**. Adding a new article now means:

1. Create a new `.md` file in `articles/`
2. That's it. No code changes.

Compared to before, where adding an article meant editing `app.js` and restarting the server. Content is fully decoupled from code.

---

## 12. Verified in the Browser

Both URLs work with the exact same route:

- `http://localhost:3000/articles/test` → serves `articles/test.md`
- `http://localhost:3000/articles/warfarin` → serves `articles/warfarin.md`

Same 4-line handler. Different files served. That's the payoff.

---

## Cheat Sheet

### Route parameter syntax

```js
app.get('/articles/:articleName', (req, res) => {
  const articleName = req.params.articleName;
  // ...
});
```

### The three main ways to grab a route parameter

```js
// Verbose
const articleName = req.params.articleName;

// Destructured (idiomatic)
const { articleName } = req.params;

// Inline (fine for one-time use)
fs.readFileSync(`articles/${req.params.articleName}.md`, 'utf8');
```

### The full pattern for markdown-file article routes

```js
const express = require('express');
const fs = require('fs');
const { marked } = require('marked');
const app = express();

app.get('/articles/:articleName', (req, res) => {
  const { articleName } = req.params;
  const contents = fs.readFileSync(`articles/${articleName}.md`, 'utf8');
  const html = marked(contents);
  res.send(html);
});

module.exports = app;
```

---

## Key Principles Learned

1. **Spot the pattern.** One thing varies + everything else repeats = you need a placeholder, not a copy-paste.
2. **`:name` in the URL creates a placeholder.** Whatever name you use after `:` becomes the key in `req.params`.
3. **`req.params` is just an object.** One property per placeholder. Look up values with dot notation.
4. **Extract to a variable.** Names should say what a value *is*, not where it *lives*.
5. **Template literals need backticks.** Single/double quotes won't do substitution.
6. **Inside `${...}`, write the variable bare.** No extra quotes, no extra backticks.

---

## The Question Still Lurking

Right now, if a user visits `/articles/does-not-exist`, what happens?

The route matches (`:articleName` accepts anything). `readFileSync` tries to open `articles/does-not-exist.md` — a file that isn't there — and crashes. The server may even stop responding.

That's the next lesson: **error handling**. What should happen when the file doesn't exist? A 404? A friendly error page? A "did you mean...?" A redirect? All valid choices — and we'll pick one deliberately.
