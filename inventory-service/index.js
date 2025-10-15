const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.json());

// simple stock: productId -> quantity
let stock = {
  'product-1': 10,
  'product-2': 5
};

// Check stock
app.get('/inventory/:productId', (req, res) => {
  const qty = stock[req.params.productId] || 0;
  res.json({ productId: req.params.productId, quantity: qty });
});

app.post('/inventory', (req, res) => {
  const { productId, quantity } = req.body;

  if (!productId || quantity == null) {
    return res.status(400).json({ error: 'productId and quantity are required' });
  }

  if (quantity < 0) {
    return res.status(400).json({ error: 'Quantity cannot be negative' });
  }

  // Add new or restock existing product
  stock[productId] = (stock[productId] || 0) + quantity;

  res.status(201).json({
    success: true,
    message: `Product ${productId} added/updated`,
    quantity: stock[productId]
  });
});

// Reserve stock synchronously (atomic in this single-node demo)
app.post('/inventory/:productId/reserve', (req, res) => {
  const { quantity = 1, orderId } = req.body;
  const pid = req.params.productId;
  const available = stock[pid] || 0;
  if (available >= quantity) {
    stock[pid] = available - quantity;
    return res.json({ success: true, productId: pid, remaining: stock[pid] });
  } else {
    return res.status(409).json({ success: false, error: 'Insufficient stock' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'inventory' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Inventory service listening ${PORT}`));
