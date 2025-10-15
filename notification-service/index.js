const express = require('express');
const bodyParser = require('body-parser');
const amqp = require('amqplib');

const app = express();
app.use(bodyParser.json());

const RABBIT_URL = process.env.RABBIT_URL || 'amqp://rabbitmq:5672';
const ORDER_QUEUE = 'orders';
let channel;

// Function to connect and consume messages
async function connectRabbit(retries = 10, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      const conn = await amqp.connect(RABBIT_URL);
      channel = await conn.createChannel();
      await channel.assertQueue(ORDER_QUEUE, { durable: true });
      console.log('✅ Connected to RabbitMQ, waiting for messages...');
      
      channel.consume(ORDER_QUEUE, (msg) => {
        if (msg !== null) {
          const content = JSON.parse(msg.content.toString());
          console.log('📩 Received message:', content);

          // Example: handle different events
          if (content.event === 'order.created') {
            console.log(`📦 Sending notification for new order ${content.data.id}`);
          }

          channel.ack(msg);
        }
      });
      return;
    } catch (err) {
      console.error(`⚠️ RabbitMQ connect failed (attempt ${i + 1}/${retries}). Retrying...`);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  console.error('❌ Could not connect to RabbitMQ. Exiting.');
  process.exit(1);
}

connectRabbit();

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'notification' }));

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Notification service running on port ${PORT}`));
