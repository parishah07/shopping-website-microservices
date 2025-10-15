const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const amqp = require('amqplib');
const CircuitBreaker = require('opossum');

const app = express();
app.use(bodyParser.json());

// RabbitMQ connection details use env vars in docker-compose
const RABBIT_URL = process.env.RABBIT_URL || 'amqp://rabbitmq:5672';
const ORDER_QUEUE = 'orders'; // main queue

let channel;

// Establish RabbitMQ connection
async function connectRabbit(retries = 10, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      const conn = await amqp.connect(RABBIT_URL);
      channel = await conn.createChannel();
      await channel.assertQueue(ORDER_QUEUE, { durable: true });
      console.log("✅ Connected to RabbitMQ");
      return;
    } catch (err) {
      console.error(`⚠️ RabbitMQ connection failed (attempt ${i + 1}/${retries}). Retrying in ${delay / 1000}s...`);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  console.error("❌ Could not connect to RabbitMQ after several attempts. Exiting...");
  process.exit(1);
}

// Wait for RabbitMQ before starting server
const PORT = process.env.PORT || 3003;
async function startServer() {
  await connectRabbit();
  app.listen(PORT, () => console.log(`Order service listening ${PORT}`));
}
startServer();


// circuit breaker options
const breakerOptions = { timeout: 5000, errorThresholdPercentage: 50, resetTimeout: 10000 };

// function to call inventory reservation
async function reserveInventory(productId, quantity, orderId) {
  const url = `http://inventory-service:3001/inventory/${productId}/reserve`;
  return axios.post(url, { quantity, orderId }, { timeout: 4000 });
}

const reserveBreaker = new CircuitBreaker(reserveInventory, breakerOptions);

// simple in-memory orders store
let orders = {};

app.post('/orders', async (req, res) => {
  try {
    const { userId, items } = req.body; // items: [{productId, quantity}]
    if (!items || items.length === 0) return res.status(400).json({ error: 'No items' });

    // For demo: try to reserve the first product synchronously (simplified)
    const item = items[0];
    // Use circuit breaker to call inventory
    const invResp = await reserveBreaker.fire(item.productId, item.quantity, 'order-temp-id')
      .catch(err => { throw err; });

    if (invResp.status !== 200) {
      return res.status(409).json({ error: 'Failed to reserve inventory' });
    }

    // Create order object
    const orderId = Date.now().toString();
    const order = { id: orderId, userId, items, status: 'created' };
    orders[orderId] = order;

    // Publish order.created event (persistent)
    const payload = Buffer.from(JSON.stringify({ event: 'order.created', data: order }));
    channel.sendToQueue('orders', payload, { persistent: true });

    return res.status(201).json(order);
  } catch (err) {
    console.error('Order creation failed', err.message || err);
    if (err.isOperational === false || err.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'Inventory service unavailable' });
    }
    return res.status(500).json({ error: 'Internal error', details: err.message });
  }
});

app.get('/orders/:id', (req, res) => {
  const o = orders[req.params.id];
  if (!o) return res.status(404).json({ error: 'Not found' });
  res.json(o);
});

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'order' }));
