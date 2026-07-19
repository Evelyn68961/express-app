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

// Export the app
module.exports = app; 