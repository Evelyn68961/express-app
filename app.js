// Load the express package
const express = require('express');

// fs (short for "file system")
const fs = require('fs'); 

// role of marked is to convert markdown to html
const { marked } = require('marked'); 

// Create an instance of an Express application
const app = express();

// Define a port
const PORT = 3000;

app.get('/', (req, res) => {
  res.send('Hello, Express!');
});

app.get('/dog', (req, res) => {
  res.send('woof');
});

// html
app.get('/hello', (req, res) => {
  res.send(`
    <h1>Hi there!</h1>
    <p>Welcome to my Express site.</p>
    <p>Today is a good day to learn backend.</p>
  `);
});

// article
app.get('/test', (req, res) => {
  const contents = fs.readFileSync('articles/test.md', 'utf8');
  const html = marked(contents);    // ← convert Markdown → HTML
  res.send(html);                  // ← send the HTML version
});

// multiple articles (with error handling)
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

// Export the app
module.exports = app; 