# Express.js Learning Notes

## 1. VS Code Terminal

Open the integrated terminal:
- **Shortcut**: `` Ctrl+` `` (Win/Linux) or `` Cmd+` `` (Mac)
- **Menu**: `View → Terminal` or `Terminal → New Terminal`
- **Command Palette**: `Ctrl+Shift+P` → "Terminal: Create New Terminal"

Terminal opens already `cd`'d into the project folder.

---

## 2. Setting Up a Node Project

### `npm init -y`
Creates a `package.json` file — the project manifest.
- `-y` = "yes to all", skips the interactive prompts and uses defaults.
- Tracks project metadata (name, version, entry point) and dependencies.

Generated file example:
```json
{
  "name": "your-folder-name",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  }
}
```

---

## 3. Installing Packages

### Runtime dependency (needed to run the app)
```bash
npm install express
```
Since npm 5, this is identical to `npm install --save express`.

### Dev-only dependency (only needed during development/testing)
```bash
npm install --save-dev jest supertest
npm install --save-dev nodemon
```

**Why the distinction?** Production servers don't need Jest or nodemon running — only your machine does while you're coding. Splitting them keeps production installs lean.

### `package-lock.json`
- Auto-maintained by npm — **don't edit by hand**.
- Records **exact versions** of every package and sub-dependency.
- Ensures everyone running `npm install` gets identical `node_modules/`.
- Commit it to git along with `package.json`.

---

## 4. Testing Tools

- **Jest** — the test runner/framework. Provides `test()`, `expect()`, `toBe()`, etc.
- **Supertest** — makes fake HTTP requests to your Express app in tests. Provides `request(app).get('/dog')` etc.

You need both because Jest alone doesn't know how to talk to Express.

---

## 5. Creating the Express App

### `app.js`
```js
// Load the express package
const express = require('express');

// Create an instance of an Express application
const app = express();

// Define a port
const PORT = 3000;

// Routes
app.get('/', (req, res) => {
  res.send('Hello, Express!');
});

app.get('/dog', (req, res) => {
  res.send('woof');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

// Export for testing
module.exports = app;
```

### Change entry point in `package.json`
```json
"main": "app.js",
```

---

## 6. Understanding Routes

General shape:
```js
app.METHOD(PATH, (req, res) => {
  res.send(SOMETHING);
});
```

- `app.get('/', ...)` = "when a GET request hits `/`, run this function"
- `req` = incoming request (URL, headers, body, query params)
- `res` = the response you send back
- `res.send('...')` = sends text back to the browser

**"Cannot GET /"** = server is alive, but no route defined for that path. Not an error, just an unmapped path.

---

## 7. `module.exports = app;`

Each `.js` file is private by default. `module.exports` opens a "window" to share things with other files.

- **Exporting side** (`app.js`): `module.exports = app;`
- **Importing side** (`app.test.js`): `const app = require('./app');`

Placed at the **bottom** of the file because Node runs top-to-bottom — `app` must be fully built before being exported.

---

## 8. Running the App

### Direct
```bash
node app.js
```

### Via npm scripts (in `package.json`)
```json
"scripts": {
  "start": "node app.js",
  "dev": "nodemon app.js",
  "test": "jest"
}
```

Then:
```bash
npm start       # or: npm run start
npm run dev     # nodemon (auto-restart on save)
npm test        # or: npm run test
```

**Special shortcut names**: `start`, `test`, `stop` don't need `run`. Custom scripts like `dev` do.

### Why use npm scripts?
1. Real commands grow long: `NODE_ENV=production node --max-old-space-size=4096 -r dotenv/config app.js` — nobody wants to type that.
2. Universal convention: anyone who clones your project runs `npm start` without needing to know the details.

---

## 9. Why `jest` alone fails but `npm test` works

### The background: how the terminal finds commands

When you type any command in the terminal (say `jest`), your shell asks: *"where is the `jest` program on this computer?"*

It answers that question by checking a list of folders called **PATH** — a system-wide setting that says "look for programs in these folders." Typical folders on PATH include things like `/usr/bin`, `/usr/local/bin`, etc. — places where **globally installed** programs live.

### Why `jest` alone fails

You didn't install Jest globally. You installed it **locally into your project** with:
```bash
npm install --save-dev jest
```

This puts Jest inside `./node_modules/` in your project folder. That folder is **not on PATH** — the shell has no idea Jest exists there. So typing `jest` gives you:
```
jest: command not found
```

### Why `npm test` works

When npm installs a package that has a command-line tool, it also creates a shortcut to that tool in a special folder: **`./node_modules/.bin/`**. So after installing Jest, you get:
```
./node_modules/.bin/jest    ← shortcut to Jest's executable
```

When you run `npm test`, npm does something clever: **it temporarily adds `./node_modules/.bin/` to PATH** just for that command. Suddenly the shell can find `jest`, runs it, and your tests execute. When the command finishes, PATH goes back to normal.

That's the whole trick — npm scripts get a "boosted" PATH that includes your local tools.

### Workarounds if you want to run tools directly

- **`npx jest`** — `npx` is a helper that also knows about `./node_modules/.bin/`. Use it when you want to run a local tool without setting up a script.
- **`./node_modules/.bin/jest`** — just type the full path yourself. Works but tedious.
- **`npm install -g jest`** — install globally, so it lands in a PATH folder. Usually a bad idea: your project pins one Jest version, your global is another, they drift apart, tests break in confusing ways.

### Same rule applies to every local tool

Nodemon, Supertest CLI, ESLint, Prettier — anything installed with `--save-dev` lives locally. Direct terminal use fails. Access them via `npm run <script>` or `npx <tool>`.

**Rule of thumb**: locally installed = call it through npm. Globally installed = call it directly.

---

## 10. nodemon — Auto-Restart on Save

Install:
```bash
npm install --save-dev nodemon
```

Add script to `package.json`:
```json
"dev": "nodemon app.js"
```

Run:
```bash
npm run dev
```

Now editing and saving `app.js` auto-restarts the server. No more `Ctrl+C` → `npm start` cycle.

- Type `rs` + Enter in the terminal to manually restart.
- `Ctrl+C` to stop.

---

## 11. Writing a Test

### `app.test.js`
```js
const request = require('supertest');
const app = require('./app');

test('GET /dog returns woof', async () => {
  const res = await request(app).get('/dog');
  expect(res.statusCode).toBe(200);
  expect(res.text).toBe('woof');
});
```

Run:
```bash
npm test
```

---

## 12. Splitting `app.js` and `server.js` (optional pattern)

### The problem
`require('./app')` runs the entire `app.js` top to bottom — including `app.listen(3000, ...)`. This means:
- Tests open port 3000 when they run.
- Errors if the dev server is already running (`EADDRINUSE`).
- Jest may not exit cleanly (open port keeps process alive).

### The fix — separate "building" from "starting"

**`app.js`** (builds the app only):
```js
const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('Hello, Express!'));
app.get('/dog', (req, res) => res.send('woof'));

module.exports = app;
// NO app.listen here
```

**`server.js`** (imports and starts it):
```js
const app = require('./app');

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
```

**`package.json`**:
```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js",
  "test": "jest"
}
```

**Analogy**: `app` is a car. `app.js` builds it. `app.listen()` drives it onto the road (`server.js`). Jest (the mechanic) wants to inspect the car in the garage — it shouldn't have to start the engine to do that.

Only needed if you hit port errors during testing. Fine to keep everything in `app.js` while learning.

---

## Quick Command Cheat Sheet

```bash
# Setup
npm init -y
npm install express
npm install --save-dev jest supertest nodemon

# Running
npm start           # production-style
npm run dev         # auto-restart
npm test            # run tests

# Terminal in VS Code
Ctrl+`              # toggle terminal
Ctrl+C              # stop running server
```
