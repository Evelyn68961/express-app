# Express.js Learning Notes — Part 4

Error handling: what happens when the requested article doesn't exist, and how to respond gracefully with proper HTTP status codes.

Continues from Part 3, where we had a working `/articles/:articleName` route that reads any Markdown file — but crashes ugly when the file isn't there.

---

## 1. Breaking It On Purpose

Starting route from Part 3:

```js
app.get('/articles/:articleName', (req, res) => {
  const articleName = req.params.articleName;
  const contents = fs.readFileSync(`articles/${articleName}.md`, 'utf8');
  const html = marked(contents);
  res.send(html);
});
```

Visiting `/articles/does-not-exist` (no such file) produces an ugly error dumped straight into the browser:

```
Error: ENOENT: no such file or directory, open 'C:\Git\express-app\articles\does-not-exist.md'
    at Object.readFileSync (node:fs:441:20)
    at C:\Git\express-app\app.js:43:23
    at Layer.handleRequest ...
    ...
```

Not helpful for users. Leaks the server's filesystem path. And under the hood, the wrong HTTP status code is being sent (500 instead of 404).

---

## 2. Reading a Node Error

The error message has three important pieces worth being able to decode:

```
Error: ENOENT: no such file or directory, open 'C:\Git\express-app\articles\does-not-exist.md'
```

| Piece | Meaning |
| ----- | ------- |
| **`ENOENT`** | Unix code — *Error: NO ENTry*. Means "the file/folder doesn't exist." Worth memorizing — it comes up constantly in Node. |
| **`no such file or directory`** | Plain-English restatement. |
| **`open '...path...'`** | The exact path Node tried to open. Your smoking gun. |

### Reading a stack trace

Stack traces read from **top** (most recent call) to **bottom** (oldest). Most of the lines are Express internals from `node_modules/` — not your problem. Scan past those and find the line that names *your* file:

```
at Object.readFileSync (node:fs:441:20)    ← the function that failed
at C:\Git\express-app\app.js:43:23         ← YOUR code, line 43 ← LOOK HERE
at Layer.handleRequest ...                 ← Express internals, ignore
at next ...                                ← Express internals, ignore
```

Rule of thumb: **skip the `node_modules/` lines. The line naming your own file is where the bug lives.**

---

## 3. Express Doesn't Crash When a Handler Throws

A crucial observation: after visiting the broken URL, the server *kept running*. Visiting `/articles/warfarin` right after still worked.

Why? Express wraps every route handler in a safety net. When your handler throws (like `readFileSync` did), Express catches the error at the boundary of that request, dumps the error info as the response, and moves on. Other requests are untouched.

**Pharmacy analogy:** if one patient's prescription lookup fails at the counter — wrong drug name, say — the pharmacist apologizes to *that* patient and hands them an error slip. The next patient in line is still served normally. The counter doesn't shut down for the day just because one lookup failed.

**Caveat:** this only holds for synchronous throws (like `readFileSync`). Async errors have quirks — a lesson for later.

---

## 4. HTTP Status Codes — The Number That Says How It Went

Every HTTP response carries a 3-digit **status code**. Common ones:

| Code | Meaning |
| ---- | ------- |
| **200** | OK — worked fine |
| **404** | Not Found — you asked for something that doesn't exist |
| **500** | Internal Server Error — the server itself broke |

Right now the crashing route returns **500** (Express's default for any thrown error). But for `/articles/does-not-exist`, that's misleading — nothing on the server actually broke. The user asked for something that doesn't exist. The correct code is **404**.

Why status codes matter:

- Search engines use them to decide "should I keep trying this URL?"
- Browsers, monitoring tools, and analytics all read them
- 500s make it look like the app is broken when really the user just typed a bad URL
- REST APIs are *entirely* driven by status codes

---

## 5. Two Approaches to Handling Missing Files

### Approach A — Check first, then read

The intuitive approach: check if the file exists before trying to read it.

```js
if (fs.existsSync(filePath)) {
  const contents = fs.readFileSync(filePath, 'utf8');
  res.send(marked(contents));
} else {
  res.status(404).send('Article not found');
}
```

Works. Common in tutorials. But has two problems.

**Problem 1: TOCTOU** — *Time Of Check to Time Of Use.* Between `existsSync` returning `true` and `readFileSync` actually reading, the world can change:

- Another process could delete the file
- Permissions could change
- The disk could go offline

The check and the use are separate steps; reality can shift between them.

**Pharmacy analogy:** at 9:00 you check the drawer and confirm warfarin is stocked. You walk away for the prescription slip. At 9:01 a colleague pulls the last bottle. At 9:02 you return confidently and grab air. The check happened, but the answer expired before you used it.

**Problem 2: Two disk reads instead of one.** `existsSync` hits the disk to check. `readFileSync` hits the disk again. Double the filesystem work for the same information.

### Approach B — Try to read, catch failure

The pattern professional Node code actually uses. One disk operation. No race window.

```js
try {
  const contents = fs.readFileSync(filePath, 'utf8');
  res.send(marked(contents));
} catch (err) {
  res.status(404).send('Article not found');
}
```

Read that in plain English:

> *"Try to read the file and send it. If anything throws, catch the error and send back a 404 instead."*

---

## 6. Anatomy of `try` / `catch`

The general shape:

```js
try {
  // code that might throw
} catch (err) {
  // code that runs only if the try block threw
}
```

- The `try` block runs top to bottom like normal.
- If something inside it throws an error, execution **jumps immediately** to the `catch` block. Any lines after the throwing line inside `try` are skipped.
- If nothing throws, the `catch` block **never runs**.

The `err` in `catch (err)` is a variable name you choose. Could be `error`, `e`, `problem` — anything. It holds the error object that was thrown. Useful properties:

| Property     | What it is                                          |
| ------------ | --------------------------------------------------- |
| `err.message` | Human-readable description                         |
| `err.code`    | Machine-readable code (`'ENOENT'`, `'EACCES'`, ...) |
| `err.stack`   | The full stack trace as a string                    |

---

## 7. `res.status(N).send(...)` — Chaining

`res.send(...)` alone always sends status 200. To send a different code:

```js
res.status(404).send('Article not found');
```

Read left to right:

```
res    .status(404)      .send('Article not found')
 ↓          ↓                       ↓
the      set the         then send this body
response  status code
```

This chains because `res.status(N)` returns `res` itself. Same pattern as jQuery, D3, and most fluent APIs — the object returns itself so you can keep calling methods on it.

You could also write it in two steps if that reads clearer:

```js
res.status(404);
res.send('Article not found');
```

Same result. Most code chains it.

---

## 8. Not All Errors Are 404 — Discriminating by `err.code`

`readFileSync` can fail for several reasons, and each gets a different `err.code`:

| Code       | Meaning                                            | Right response |
| ---------- | -------------------------------------------------- | -------------- |
| **ENOENT** | No such file or directory                          | 404 Not Found  |
| **EACCES** | Permission denied (file exists but can't read it)  | 500 (server issue) |
| **EISDIR** | Path is a directory, not a file                    | 500 (server issue) |
| **EMFILE** | Too many open files (server overloaded)            | 500 (server issue) |

Sending 404 for *every* error would tell users "article not found" even when the article exists but the server has a permissions bug. That's misleading and hides real problems.

**Pharmacy analogy:** if warfarin can't be dispensed because the drawer is broken vs. because it's out of stock, telling the patient "we don't carry warfarin" in both cases is wrong. The response should be honest about what actually went wrong.

The right pattern: check `err.code` and branch.

```js
} catch (err) {
  if (err.code === 'ENOENT') {
    res.status(404).send('Article not found');
  } else {
    res.status(500).send('Something went wrong');
  }
}
```

- **ENOENT** → user asked for something that doesn't exist → 404
- **Anything else** → the server itself has a problem → 500

This matches HTTP semantics:

- **4xx codes** = "the client made a bad request" (user's fault, kind of)
- **5xx codes** = "the server had a problem" (server's fault)

---

## 9. Final Route — Full Version

Putting it all together:

```js
app.get('/articles/:articleName', (req, res) => {
  const { articleName } = req.params;

  try {
    const contents = fs.readFileSync(`articles/${articleName}.md`, 'utf8');
    const html = marked(contents);
    res.send(html);
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.status(404).send('Article not found');
    } else {
      res.status(500).send('Something went wrong');
    }
  }
});
```

---

## 10. Three-Case Verification

Every error-handling route should be verified against three scenarios:

| URL                                    | Case                | Expected result                    | Status |
| -------------------------------------- | ------------------- | ---------------------------------- | ------ |
| `/articles/warfarin`                   | Happy path          | Article renders normally           | 200    |
| `/articles/does-not-exist`             | Missing file        | Friendly "Article not found" text  | 404    |
| `/articles/test`                       | Another happy path  | Renders normally (proves catch didn't accidentally fire) | 200    |

If all three behave correctly, error handling is wired up right.

### How to see the status code

The status number itself isn't in the page body. Two ways to see it:

**DevTools (proper way):**
1. Open the URL
2. Press `F12` → **Network** tab
3. Refresh the page (`F5`)
4. Click the request → status shows in the top-right (e.g. `Status: 404`)

**Eyeball test:** if the page shows `Article not found`, the code branched into the 404 path — good enough for a sanity check.

---

## 11. Why This Pattern Is the Real Thing

The route as-written now has all the shape of a production backend:

- One route serving unlimited articles
- Content decoupled from code (add articles by dropping `.md` files)
- Proper HTTP status codes (200 / 404 / 500 in the right cases)
- Error isolation — one bad request doesn't crash the server
- Client errors distinguished from server errors

This pattern generalizes. Swap `fs.readFileSync` for a database call, a Notion API request, or a Google Docs fetch, and the *shape* stays the same:

```js
try {
  const data = await fetchFromSomewhere(key);
  res.send(renderIt(data));
} catch (err) {
  if (err.code === 'NOT_FOUND' /* or however the source signals it */) {
    res.status(404).send('Not found');
  } else {
    res.status(500).send('Something went wrong');
  }
}
```

---

## Cheat Sheet

### The pattern

```js
try {
  // do the risky thing
} catch (err) {
  // handle the failure
}
```

### Common Node file error codes

| Code       | Cause                          |
| ---------- | ------------------------------ |
| ENOENT     | File doesn't exist             |
| EACCES     | Permission denied              |
| EISDIR     | Expected a file, got a folder  |
| EMFILE     | Too many open files            |

### HTTP status codes worth memorizing

| Code | Meaning                | When to send                            |
| ---- | ---------------------- | --------------------------------------- |
| 200  | OK                     | Success (the default)                   |
| 301  | Moved Permanently      | This URL has moved forever              |
| 302  | Found (redirect)       | Temporary redirect                      |
| 400  | Bad Request            | Client sent garbage input               |
| 401  | Unauthorized           | Not logged in                           |
| 403  | Forbidden              | Logged in but not allowed               |
| 404  | Not Found              | Resource doesn't exist                  |
| 500  | Internal Server Error  | Server broke unexpectedly               |

### Setting status + body

```js
res.status(404).send('Article not found');
res.status(500).send('Something went wrong');
res.send('OK');  // implicit 200
```

---

## Key Principles Learned

1. **`ENOENT` = file doesn't exist.** The most common `fs` error. Recognize it on sight.
2. **Read stack traces from the top, but jump to your own file.** Skip past `node_modules/` lines.
3. **Express catches synchronous throws per-request.** One bad request doesn't kill the server.
4. **Prefer `try`/`catch` over `existsSync` + read.** One disk operation, no TOCTOU race.
5. **HTTP status codes are the response's "how it went" signal.** 4xx = client's fault; 5xx = server's fault.
6. **Discriminate errors by `err.code`.** Not every error is a 404. Missing file → 404; anything else → 500.
7. **`res.status(N).send(...)` chains** because `res.status(N)` returns `res`.
8. **This pattern generalizes.** File reads, database calls, API fetches — the try/catch/branch shape is the same.

---

## The Question Still Lurking

Right now every article page is just raw HTML from Markdown — no header, no CSS, no navigation. The `<h1>` and `<p>` tags are there, but there's no `<html>`, no `<head>`, no styling.

For a real clinical reference site, we'd want:

- A consistent site layout (header, footer, nav)
- CSS for readable typography
- Links between articles
- Maybe an index page listing all available articles

There are two general directions to go here:

- **Templates** — HTML files with placeholders, filled in per request (EJS, Handlebars, Pug)
- **An index page** — a route that lists all `.md` files in the `articles/` folder as clickable links

Both are useful. Either could be the next lesson.
