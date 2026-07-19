# Express.js Learning Notes — Part 2

Serving article content from files instead of hardcoding it in `app.js`.

---

## 1. The Problem We Started With

The basic route pattern from Part 1 works fine for one-off responses:

```js
app.get('/dog', (req, res) => {
  res.send('woof');
});
```

But what if we want to serve an actual article — several paragraphs of text? The naive approach is to stuff the HTML directly into the route:

```js
app.get('/hello', (req, res) => {
  res.send(`
    <h1>My First Article</h1>
    <p>Paragraph one about warfarin dosing...</p>
    <p>Paragraph two about INR monitoring...</p>
    <p>...twenty more paragraphs...</p>
  `);
});
```

### Why this feels wrong

Two very different jobs are mixed into one file:

| Kind of work         | What it is                              | How often it changes |
| -------------------- | --------------------------------------- | -------------------- |
| **Server logic**     | Setting up Express, routes, `listen()`  | Rarely               |
| **Article content**  | The actual words of the article         | Often                |

Every typo fix means opening the file that runs the whole server. `app.js` bloats. Colleagues can't help write articles without touching backend code.

### The principle

> **Content belongs in its own file. Code belongs in its own file. The code *reads* the content.**

**Pharmacy analogy:** taping drug monographs to the inside of a dispensing machine's control panel means opening the machine to update a monograph. The machine and the paperwork should live in different places.

---

## 2. `res.send` Can Send HTML

Before separating content into files, one thing worth knowing: `res.send` doesn't care whether the string is plain text or HTML. The browser figures out how to display whatever it receives.

```js
app.get('/hello', (req, res) => {
  res.send('<h1>Hi there!</h1>');
});
```

Renders as a big bold heading in the browser — not as literal tag text.

### Template literals for multi-line strings

Use **backticks** (`` ` ``) instead of quotes when the string spans multiple lines:

```js
res.send(`
  <h1>Hi there!</h1>
  <p>Welcome to my Express site.</p>
`);
```

Regular `'...'` or `"..."` strings break if you press Enter inside them. Template literals don't.

---

## 3. Route Placement — Top-to-Bottom Execution

Node reads `app.js` line by line, top to bottom. Routes must be registered **before** `app.listen(...)` (or in `server.js` after importing `app` — see next section):

```js
const express = require('express');
const app = express();

// 1. Register routes first
app.get('/', ...);
app.get('/hello', ...);
app.get('/bye', ...);

// 2. Then start the server
app.listen(3000, ...);

// 3. Or export for use by server.js
module.exports = app;
```

**Analogy:** set up the whole dispensing station — labels, bins, scanner, printer — *then* open the counter to patients. Don't start handing out prescriptions while still plugging in the printer.

---

## 4. Reading a File From Disk — `fs`

Node comes with a built-in module called **`fs`** ("file system") for talking to files on disk. It's built-in, so no `npm install` needed.

```js
const fs = require('fs');

const contents = fs.readFileSync('articles/test.md', 'utf8');
```

### Arguments explained

| Argument               | What it means                                            |
| ---------------------- | -------------------------------------------------------- |
| `'articles/test.md'`   | Path to the file, relative to where you ran `node`       |
| `'utf8'`               | "Give me a normal string, not a raw byte buffer"         |

Without `'utf8'`, you'd get something like `<Buffer 23 20 48 65 6c 6c 6f ...>` (raw bytes). With `'utf8'`, you get a friendly string like `"# Hello from a file\n\nThis came from test.md"`.

### `readFileSync` vs `readFile`

`Sync` = synchronous = "wait right here until the file is read, then continue." Simple and fine for small files. There's an async version (`fs.readFile`) that's non-blocking, but `Sync` is easier to reason about while learning.

---

## 5. Folder Structure So Far

```
express-app/
├── app.js
├── server.js
├── package.json
├── package-lock.json
└── articles/
    └── test.md
```

Content lives in `articles/`. Code lives in `app.js`. Clean separation.

---

## 6. First Working Version — Serve a Raw File

```js
const express = require('express');
const fs = require('fs');
const app = express();

app.get('/test', (req, res) => {
  const contents = fs.readFileSync('articles/test.md', 'utf8');
  res.send(contents);
});

module.exports = app;
```

Visit `http://localhost:3000/test` and the browser shows the file's contents.

### The surprise waiting there

If `test.md` contains:

```md
# Hello from a file

This came from test.md
```

The browser shows:

```
# Hello from a file This came from test.md
```

Two things went "wrong":

**Surprise 1:** The `#` shows as literal text. `#` means "heading" in Markdown, but the browser only speaks HTML. It has no idea what Markdown is.

**Surprise 2:** The blank line disappeared. HTML ignores whitespace. A paragraph break in HTML requires `<p>...</p>` tags, not a blank line.

### The takeaway

Express read the file as a plain string and sent it. The browser didn't translate — because *no one told it to*. We need a step in the middle:

```
test.md  →  fs reads file  →  raw markdown string  →  CONVERTER  →  HTML string  →  res.send  →  browser
```

---

## 7. Adding the Markdown → HTML Converter — `marked`

**`marked`** is a small, popular npm package that translates Markdown syntax into HTML.

### Install

```bash
npm install marked
```

Not `--save-dev`, because the conversion happens **every time a user visits an article on the live server** — not just during development. It's a runtime dependency.

### Mental test for future installs

> *"Does the live app need this to serve users? Or is it only for me while I code?"*

| Package    | Where it belongs      | Why                                 |
| ---------- | --------------------- | ----------------------------------- |
| express    | `dependencies`        | The live server needs it            |
| marked     | `dependencies`        | Converts markdown for every request |
| jest       | `devDependencies`     | Only run during development         |
| supertest  | `devDependencies`     | Only used inside tests              |
| nodemon    | `devDependencies`     | Only for local auto-restart         |

---

## 8. Using `marked` in the Route

Two small changes to `app.js`:

### Change 1 — Require it

```js
const express = require('express');
const fs = require('fs');
const { marked } = require('marked');   // ← curly braces (see next section)
const app = express();
```

### Change 2 — Add it to the flow

```js
app.get('/test', (req, res) => {
  const contents = fs.readFileSync('articles/test.md', 'utf8');
  const html = marked(contents);   // ← convert Markdown → HTML
  res.send(html);                  // ← send the HTML version
});
```

Now `/test` renders the file properly — `#` becomes an `<h1>`, blank lines become paragraph breaks.

---

## 9. Why the Curly Braces on `marked`?

```js
const express = require('express');       // no braces
const fs = require('fs');                 // no braces
const { marked } = require('marked');     // braces
```

### What's happening

Some packages `module.exports = oneThing`. You grab it with no braces:

```js
// express internally: module.exports = expressFunction
const express = require('express');
```

Other packages `module.exports = { thing1, thing2, thing3 }` — an object with multiple things inside. `marked` is one of these:

```js
// marked internally: module.exports = { marked: fn1, parse: fn2, Lexer: fn3, ... }
```

Without braces, you'd get the whole box:

```js
const markedPackage = require('marked');
const html = markedPackage.marked(contents);   // clunky
```

The curly braces are called **destructuring** — a JavaScript shortcut meaning *"open the object, pull out the property named `marked`, and put it in a variable of the same name."*

```js
const { marked } = require('marked');   // grab just `marked` out of the object
```

**Pharmacy analogy:** `require('marked')` hands you the whole medication cart. `const { marked } = require('marked')` says *"I only need the syringe from the cart — just that."*

### Common examples of this pattern

```js
const { readFileSync } = require('fs');       // just the read function
const { marked } = require('marked');         // just the marked function
const { Router } = require('express');        // just the Router class
```

---

## 10. What We've Built

A route that:

1. Reads a file from disk ✅
2. Converts Markdown to HTML ✅
3. Sends the HTML to the browser ✅

Content and code are now **separate**. `test.md` can be edited, replaced, or added to — and `app.js` doesn't need to change.

---

## 11. The Question Still Lurking

Right now `/test` always reads `articles/test.md`. What happens when we want a second article — `articles/warfarin.md`?

Option A: Add a second route.

```js
app.get('/test', (req, res) => {
  const contents = fs.readFileSync('articles/test.md', 'utf8');
  res.send(marked(contents));
});

app.get('/warfarin', (req, res) => {
  const contents = fs.readFileSync('articles/warfarin.md', 'utf8');
  res.send(marked(contents));
});

app.get('/amiodarone', (req, res) => {
  const contents = fs.readFileSync('articles/amiodarone.md', 'utf8');
  res.send(marked(contents));
});
// ... etc
```

The route handler code is **identical every single time** — only the filename changes. That's a smell.

The next lesson: **route parameters** (`:slug`) so one route can handle any article name. But that's for next session.

---

## Cheat Sheet

```bash
# Install marked as a runtime dependency
npm install marked
```

```js
// Read a file
const fs = require('fs');
const contents = fs.readFileSync('articles/test.md', 'utf8');

// Convert Markdown to HTML
const { marked } = require('marked');
const html = marked(contents);

// Send it
res.send(html);
```

```js
// Full route
app.get('/test', (req, res) => {
  const contents = fs.readFileSync('articles/test.md', 'utf8');
  const html = marked(contents);
  res.send(html);
});
```

---

## Key Principles Learned

1. **Separate content from code** — content changes often, code changes rarely
2. **`res.send` speaks whatever string you give it** — plain text, HTML, or generated markup
3. **The browser only understands HTML** — Markdown must be converted first
4. **Runtime vs dev dependencies** — ask "does the live app need this?"
5. **Destructuring `{ thing }`** — pull one property out of an exported object
6. **Node reads top-to-bottom** — register routes before starting the server
