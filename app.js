// Load the express package
const express = require('express');

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

app.get('/hello', (req, res) => {
  res.send(`
    <h1>Hi there!</h1>
    <p>Welcome to my Express site.</p>
    <p>Today is a good day to learn backend.</p>
  `);
});

// Export the app
module.exports = app; 