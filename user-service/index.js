const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.json());

let users = {}; // in-memory store {id: {id,name,email}}

app.get('/users', (req, res) => {
  res.json(Object.values(users)); // return all users
});

app.post('/users', (req, res) => {
  const id = Date.now().toString();
  const { name, email } = req.body;
  users[id] = { id, name, email };
  res.status(201).json(users[id]);
});

app.get('/users/:id', (req, res) => {
  const u = users[req.params.id];
  if (!u) return res.status(404).json({ error: 'Not found' });
  res.json(u);
});

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'user' }));

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => console.log(`User service listening ${PORT}`));
