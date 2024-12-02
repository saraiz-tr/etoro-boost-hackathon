// server.js
const express = require('express');
const cors = require('cors');
const app = express();
const port = 4000;

app.use(cors());
app.get('/', (req, res) => {
  res.json('hello etoro boost');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});