// ─── Dependencies ───
const express = require('express');  // for creating the web server
const fs = require('fs'); // for reading files from the filesystem
const path = require('path'); // for working with file paths
const { marked } = require('marked'); // for converting Markdown to HTML

// ─── Constants ───
const ARTICLES_DIR = path.join(__dirname, 'articles'); // directory where article files are stored
const VALID_SLUG = /^[a-z0-9-]+$/i; // regex to validate article slugs (only letters, numbers, and hyphens)

// ─── App setup ───
const app = express(); // create an Express application
app.set('view engine', 'ejs'); // set EJS as the template engine
app.set('views', path.join(__dirname, 'views')); // set the directory for EJS templates
app.use(express.static(path.join(__dirname, 'public'))); // serve static files from the 'public' directory

// ─── Helpers ───
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── Routes ───

// Home page — lists all articles found in ARTICLES_DIR.
app.get('/', (req, res) => {
  try {
    const files = fs.readdirSync(ARTICLES_DIR);
    const articles = files
      .filter(name => name.endsWith('.md'))
      .map(name => name.slice(0, -3))   // just chop off the last 3 characters
      .map(slug => ({ slug, title: capitalize(slug) }));

    res.render('index', {
      title: 'Articles',
      articles,
      page: 'home'
    });
  } catch (err) {
    res.status(500).send('Something went wrong');
  }
});

// Learning artifacts — kept from earlier lessons, not used by the site.
app.get('/dog', (req, res) => res.send('woof'));

app.get('/hello', (req, res) => {
  res.send(`
    <h1>Hi there!</h1>
    <p>Welcome to my Express site.</p>
    <p>Today is a good day to learn backend.</p>
  `);
});

// Article page — reads any ARTICLES_DIR/<slug>.md and renders it.
app.get('/articles/:articleName', (req, res) => {
  const { articleName } = req.params;

  if (!VALID_SLUG.test(articleName)) {
    return res.status(404).send('Article not found');
  }

  try {
    const contents = fs.readFileSync(path.join(ARTICLES_DIR, `${articleName}.md`), 'utf8');
    res.render('article', {
      title: capitalize(articleName),
      body: marked(contents),
      page: 'article'
    });
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.status(404).send('Article not found');
    } else {
      res.status(500).send('Something went wrong');
    }
  }
});

// Raw Markdown source — serves the underlying .md file for download.
app.get('/articles/:articleName/raw', (req, res) => {
  const { articleName } = req.params;

  if (!VALID_SLUG.test(articleName)) {
    return res.status(404).send('Article not found');
  }

  const filePath = path.join(ARTICLES_DIR, `${articleName}.md`);
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).send('Article not found');
    }
  });
});

module.exports = app;