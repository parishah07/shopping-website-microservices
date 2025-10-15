const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secret';

// simple JWT validation middleware
function authRequired(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Missing auth' });
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Public route: create user (no auth)
app.use('/users', createProxyMiddleware({ target: 'http://user-service:3004', changeOrigin: true }));

// Orders require auth
app.use('/orders', authRequired, createProxyMiddleware({ target: 'http://order-service:3003', changeOrigin: true }));

// Inventory admin routes (protected)
app.use('/inventory', authRequired, createProxyMiddleware({ target: 'http://inventory-service:3001', changeOrigin: true }));

// health
app.get('/health', (req, res)=> res.json({ status: 'ok', gateway: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log(`API Gateway listening on ${PORT}`));
w