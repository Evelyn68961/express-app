# Express.js Learning Notes — Part 7

Images in articles: serving them, referencing them from Markdown, sizing them, and writing good alt text.

Continues from Part 6, where `express.static('public')` was wired up to serve CSS. That same one line already serves images — this part is mostly about *how to reference and style them*, not how to serve them.

---

## 1. Good News From Step 6

`express.static('public')` doesn't care about file types. CSS, images, PDFs, fonts, videos — anything dropped inside `public/` is served automatically.

Which means: **adding images is nearly free.** Drop a file in `public/images/`, reference it in Markdown, done.

Zero code changes in `app.js`. Zero new packages. The infrastructure was built in step 6.

---

## 2. Absolute vs Relative URLs — The Main Gotcha

The most common early mistake with images in Express: forgetting the leading `/` in the URL.

### The two kinds of URL

**Absolute URL** (starts with `/`):

```md
![alt](/images/warfarin-molecule.png)
```

Reads as: *"Start from the site root, then go to `images/warfarin-molecule.png`."* Always resolves to the same file, no matter which page the browser is currently viewing.

**Relative URL** (no leading `/`):

```md
![alt](images/warfarin-molecule.png)
```

Reads as: *"Start from wherever I am right now, then go into `images/`."* The browser resolves it relative to the current URL's path.

### Why relative URLs break in Express

| Current page URL | `images/warfarin.png` resolves to | Result |
| ---------------- | --------------------------------- | ------ |
| `http://localhost:3000/` | `http://localhost:3000/images/warfarin.png` | ✅ works |
| `http://localhost:3000/articles/warfarin` | `http://localhost:3000/articles/images/warfarin.png` | ❌ 404 |

On the article page, the browser thinks *"start from `/articles/`"* and looks for `/articles/images/warfarin.png` — which doesn't exist.

### The rule

> **For Express apps, always use absolute URLs (with a leading `/`) in Markdown and HTML.**

You've already been following this rule in your template:

```html
<link rel="stylesheet" href="/style.css">   <!-- leading / -->
<a href="/">Home</a>                        <!-- leading / -->
```

Same for images.

### Pharmacy analogy

*"Bin 47"* vs *"third bin from where you're currently standing."* The first is absolute (same bin no matter where you are). The second is relative (bin identity depends on your starting position). For a hospital pharmacy with many stations, absolute references are always safer.

---

## 3. URL Reminders From Step 6

The "invisible folder" rule still applies:

| File on disk | URL |
| ------------ | --- |
| `public/images/warfarin-molecule.png` | `/images/warfarin-molecule.png` |
| `public/images/warfarin/molecule.png` | `/images/warfarin/molecule.png` |
| `public/pdfs/warfarin-monograph.pdf` | `/pdfs/warfarin-monograph.pdf` |

The `public/` prefix disappears; everything inside is preserved as the URL path.

---

## 4. Markdown Image Syntax

```md
![alt text](/path/to/image.png)
```

Three parts:

- `!` at the start makes it an **image** (versus a regular link)
- `[alt text]` — description in square brackets
- `(/path/to/image.png)` — URL in round brackets
- **No space** between `]` and `(`

Compared to a plain link:

```md
[click here](/some-page)      <!-- link -->
![alt text](/some-image.png)  <!-- image -->
```

The only difference is the leading `!`.

---

## 5. The First Trap — Images Overflow By Default

Add an image with no CSS and the browser uses the image's **natural dimensions**. If your source PNG is 1600px wide but the article column is 720px, the image bursts out of the column and forces horizontal scroll.

This isn't Express's fault. It's HTML's default behavior. Every site displaying images has to solve it.

### The floor fix — never overflow

Rule that every image project needs:

```css
main img {
  max-width: 100%;
  height: auto;
}
```

- **`max-width: 100%`** — image can never be wider than its container. Container is 720px, so images cap at 720px.
- **`height: auto`** — width and height scale proportionally. Preserves aspect ratio.

Two lines, and images will always fit their column, no matter the source dimensions.

---

## 6. The Second Problem — Molecules Are Too Prominent

`max-width: 100%` prevents overflow, but a 1600px molecule will still render at 720px — dominating the article. A structural formula is a *supporting* diagram, not the main content. It shouldn't be bigger than the surrounding paragraphs.

For a clinical reference site, most images are similar-purpose diagrams (molecule structures, ECG traces, drug interaction charts). Consistency > per-image tweaking. So the pattern is to pick a **default size** for all article images.

### The full image rule

```css
main img {
  max-width: 400px;      /* sane ceiling for a supporting figure */
  width: 100%;           /* shrink to fit on narrow screens */
  height: auto;          /* preserve aspect ratio */
  display: block;        /* enable margin auto centering / block layout */
  margin: 1.5rem 0;      /* vertical breathing room, no horizontal centering */
  border-radius: 4px;    /* subtle rounded corners */
}
```

### Two concepts to know first

Before the line-by-line breakdown, two words that show up in every CSS rule from here on:

**"Container"** — the element that *holds* another element. HTML is nested boxes. An `<img>` inside `<main>` has `<main>` as its container. When we say "the image can't be wider than its container," we mean: whatever box surrounds the image sets the boundary.

**"Inline vs block"** — HTML elements come in two flavors:

- **Inline** elements flow with text, like words in a sentence. `<a>`, `<img>`, `<span>` are inline by default. Multiple can sit side-by-side on the same line.
- **Block** elements stack top-to-bottom like paragraphs. `<p>`, `<h1>`, `<div>`, `<main>` are block by default. Each takes its own line.

By default, `<img>` is **inline** — the browser treats it like a big word inside a sentence. That default causes small problems for centering and spacing, which is why one of the rules below overrides it.

### Line-by-line

- **`max-width: 400px`** — the "sanity ceiling." Images can never exceed 400px, no matter the source. 400 is a reasonable default for structural formulas; 500 for busier diagrams; 300 for compact icons.
- **`width: 100%`** — tells the image to fill its container. Combined with `max-width: 400px`:
  - On a wide screen (container is 720px wide) → image caps at 400px
  - On a narrow screen (container is 300px wide, like a phone) → image shrinks to 300px, matching the container

  Without `width: 100%`, the image would stay at its natural pixel size on narrow screens and overflow again. Think of it as *"match the room you're in, but never grow past 400px."*
- **`height: auto`** — as the width changes, scale the height proportionally. Without this, the image keeps its original height while getting narrower — squashing into a distorted rectangle. A 400×300 image scaled to 200 wide should be 150 tall, not 300 tall. `height: auto` does that math automatically.
- **`display: block`** — switches the image from `inline` (flows with text) to `block` (takes its own line). Two benefits:
  - Enables centering with `margin: X auto` (which only works on block elements)
  - Vertical margins behave normally (inline margins are quirky — they only apply left/right)

  Basically: *"treat this image like a paragraph, not like a big word."*
- **`margin: 1.5rem 0`** — top/bottom = `1.5rem` (breathing room from surrounding text). Left/right = `0` (stays at left edge). See Section 7 for the auto/0 tradeoff.
- **`border-radius: 4px`** — subtle rounded corners. Optional but makes photos and screenshots feel less "pasted in." Invisible on transparent backgrounds like molecule diagrams.

---

## 7. Centering vs Left-Aligned — Same Trick, Opposite Outcome

The `margin` property controls alignment. One value flip changes the whole feel of the page.

```css
margin: 1.5rem auto;   /* centered */
margin: 1.5rem 0;      /* left-aligned */
```

Both keep the vertical spacing (`1.5rem` top and bottom). Only the horizontal changes:

- **`auto`** on left/right → distributes remaining space equally → **centered**
- **`0`** on left/right → no extra space → **stays at left edge of container**

### When to pick which

| Design | Best for |
| ------ | -------- |
| **Centered** (`auto`) | Editorial, magazine-style articles where images are *featured* content |
| **Left-aligned** (`0`) | Technical documentation, reference sites where images are *supporting* content |

For a clinical reference where the reader's eye anchors to the left-aligned text, **left-aligned images feel more visually connected**. The molecule sits in the same vertical rail as the heading and paragraphs.

Same centering trick used earlier (`main`, `header`, `footer` all use `margin: X auto`) — the article container itself is centered on the page, so all its child text sits at a consistent left edge. Images matching that left edge look intentional.

---

## 8. Alt Text — Genuinely Important for Clinical Content

Alt text is the description in square brackets:

```md
![warfarin molecule](/images/warfarin-molecule.png)
   ↑
   alt text
```

Rendered into HTML as:

```html
<img src="/images/warfarin-molecule.png" alt="warfarin molecule">
```

You never see it on a normal page load. But it does three real jobs:

| When it's used | Who benefits |
| -------------- | ------------ |
| Screen readers read it aloud | Blind and low-vision users |
| Shown when image fails to load | Users on slow/broken connections |
| Indexed by search engines | Anyone finding the page via Google Images |

### Why it matters extra for clinical content

Clinical diagrams *are* the content. A molecule structure isn't decoration. A blind pharmacist visiting your reference site needs to know what's in the image, not just that an image exists.

### Compare three alt texts for the same molecule

| Alt text | Screen reader announcement | Verdict |
| -------- | -------------------------- | ------- |
| `image` | "Image" | Useless. |
| `warfarin molecule` | "Warfarin molecule" | Barely better than the article title. |
| `Warfarin structural formula: a coumarin ring linked to a phenyl-substituted acetone side chain` | Full description | **Actually useful.** |

The good version doesn't just *label* the image — it *describes what's in it*, at a level a reader would find useful.

### Rules for good alt text

1. **Describe what's in the image, not what it is.**
   - ❌ "Picture of an ECG"
   - ✅ "12-lead ECG showing atrial fibrillation with rapid ventricular response, HR 145"

2. **Include the clinically relevant details.** For your domain: rhythm, rate, intervals, obvious abnormalities, drug names, doses shown.
   - ❌ "Warfarin dosing table"
   - ✅ "Warfarin dosing algorithm by INR: 1.5–1.9 hold one dose; 5.0–9.0 hold 1–2 doses; >9.0 hold and give vitamin K"

3. **Skip "image of" / "picture of."** Screen readers already announce that it's an image.
   - ❌ "Image of a molecule"
   - ✅ "Coumarin derivative with phenyl substituent"

4. **Length: aim for one useful sentence.** A sentence that describes the *point* of the image. If the image needs paragraphs of explanation, put that in the article body — alt text is the gist.

5. **Decorative images get `alt=""` (empty)** — screen readers skip them. Rarely applies to clinical content; every image in a clinical reference is content.

---

## 9. Image Format — PNG vs SVG vs JPG

Every image file is one of these three formats (roughly). Choosing right matters for file size, quality, and how the image scales.

### The three formats

| Format | What it stores | Best for |
| ------ | -------------- | -------- |
| **JPG / JPEG** | Compressed pixel data. Lossy. | Photos with gradients (real-world images) |
| **PNG** | Pixel data with transparency support. Lossless. | Sharp-edged content (screenshots, diagrams with transparency) |
| **SVG** | Vector math (lines, curves, shapes) — not pixels | Anything drawn from geometry |

### The critical distinction: raster vs vector

- **JPG and PNG are "raster"** — grids of colored pixels. Zoom in far enough and you see the individual squares. Fixed resolution: a 400px-wide PNG blurs when displayed at 800px.
- **SVG is "vector"** — mathematical instructions ("draw a hexagon here, connect a line to this point"). Infinitely scalable. Sharp at any zoom.

### For clinical content specifically

| Content type | Recommended | Why |
| ------------ | ----------- | --- |
| Molecule structural formulas | **SVG**, PNG fallback | Sharp at any zoom, small file size, editable in code |
| ECG traces (12-lead, single-lead) | **SVG**, PNG fallback | Vector lines stay crisp when zoomed for detail |
| Photos (pills, syringes, patients) | **JPG** | Photographic content compresses well as JPG |
| Screenshots of software interfaces | **PNG** | Sharp text and UI edges, no compression artifacts |
| Charts and graphs | **SVG** | Same reason as ECGs |
| Icons and logos | **SVG** | Standard for icons everywhere |

### Simplified rule of thumb

- Drawn from **geometry** (lines, shapes, chemistry) → SVG
- A **photograph** (real-world image with gradients) → JPG
- A **screenshot** with sharp UI → PNG

### Note on SVG source

SVGs sometimes come from tools like ChemDraw, PubChem, or Wikimedia. Source can look messy — hundreds of lines of `<path d="M42.3 118.5..."`. That's normal. Save the `.svg` file to `public/images/` and reference it exactly like a PNG:

```md
![Warfarin structural formula](/images/warfarin-molecule.svg)
```

Zero code change. `express.static` serves it. The browser renders SVG natively.

---

## 10. Folder Organization — Subfolder Per Article

Once there are more than 5–10 images, you have to decide how to group them.

### Three common patterns

**A: One flat folder**

```
public/images/
├── warfarin-molecule.png
├── warfarin-dosing.svg
├── amiodarone-molecule.png
└── afib-ecg-lead-ii.png
```

Simple. Messy past ~30 images. Hard to see which images belong to which article.

**B: Subfolder per article** ← chosen for this project

```
public/images/
├── warfarin/
│   ├── molecule.png
│   └── dosing.svg
├── amiodarone/
│   ├── molecule.png
│   └── ecg.png
└── afib/
    └── ecg-lead-ii.png
```

Clear ownership. Easy to clean up. Scales to hundreds of articles.

**C: Categorized by content type**

```
public/images/
├── molecules/
├── ecgs/
├── charts/
└── screenshots/
```

Good if the same image is reused across many articles. Otherwise messy in practice.

### Why Pattern B fits a clinical reference site

- Articles are the natural unit of ownership — the Warfarin article "owns" the warfarin molecule
- The Antibiotics Guide backend will have dozens of drugs, each with several images
- Adding a new drug: create the `.md` file + create the folder with images → done
- Zero risk of filename collision (`molecule.png` in `warfarin/` doesn't clash with `molecule.png` in `amiodarone/`)

### Reference syntax

```md
![Warfarin structural formula](/images/warfarin/molecule.png)
```

Trivially different from `/images/warfarin-molecule.png` in practice, but scales cleanly.

### Current project state

For this session, only one image exists (`public/images/warfarin-molecule.png`) so no reorganization was needed yet. Move to Pattern B when adding the second article's images.

---

## Cheat Sheet

### Markdown image syntax

```md
![alt text](/absolute/path/to/image.png)
```

### The essential CSS rule

```css
main img {
  max-width: 400px;
  width: 100%;
  height: auto;
  display: block;
  margin: 1.5rem 0;
  border-radius: 4px;
}
```

### Common tweaks

| Want | Change |
| ---- | ------ |
| Bigger images | `max-width: 500px` or `600px` |
| Smaller images | `max-width: 300px` |
| Center instead of left-align | `margin: 1.5rem auto` |
| More vertical space | `margin: 2rem 0` |
| Sharp corners | Remove `border-radius` |

### URL mapping

| File on disk | URL |
| ------------ | --- |
| `public/images/foo.png` | `/images/foo.png` |
| `public/images/warfarin/molecule.png` | `/images/warfarin/molecule.png` |

### Format decision tree

```
Is the image drawn from geometry (lines, shapes)?
├─ YES → SVG
└─ NO → Is it a photograph?
         ├─ YES → JPG
         └─ NO  → PNG
```

---

## Key Principles Learned

1. **Images use the same `express.static` mechanism as CSS.** Nothing new to install or configure.
2. **Always use absolute URLs (leading `/`) in Markdown.** Relative URLs break on any nested route like `/articles/warfarin`.
3. **`max-width: 100%; height: auto`** is the minimum viable image rule — prevents overflow at any screen size.
4. **A consistent default size beats per-image tweaking** for a technical reference site.
5. **`margin: X auto` centers; `margin: X 0` stays left-aligned.** Same trick, different outcome.
6. **Alt text is content, not decoration.** For clinical images, describe what's in the image at a level a blind reader would find useful.
7. **SVG for geometry, JPG for photos, PNG for screenshots.** Get this right at upload time; converting later is painful.
8. **Subfolder per article scales; flat folders don't.** Adopt Pattern B before it becomes painful to reorganize.

---

## What Step 7 Cost, Compared to Step 6

- **Code added to `app.js`:** none
- **New npm packages:** none
- **New CSS rules:** one (article images)
- **New Markdown convention:** absolute URLs

That's the return on the `express.static` investment from step 6. Every future static asset — favicons, downloadable PDFs, videos — will cost about the same.

---

## The Question Still Lurking

Users can now read a single article page beautifully. But they can't *find* the articles in the first place. There's no home page listing what's available. Right now, you have to know the exact URL to type.

The next natural step is the **index page** at `/` — a route that:
- Reads the `articles/` folder to see what `.md` files exist
- Renders a list of links to each one
- Wraps in the same EJS template shell

This introduces one new tool: `fs.readdirSync` (reading a *folder* instead of a single file), and one new EJS feature: **loops** (`<% for %>` tags). That's step 8.
