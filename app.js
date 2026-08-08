// ─── Dependencies ───
const express = require('express');
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

// ─── Constants ───
const ARTICLES_DIR = path.join(__dirname, 'articles');
const VALID_SLUG = /^[a-z0-9-]+$/i;

// ─── App setup ───
const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

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

module.exports = app;