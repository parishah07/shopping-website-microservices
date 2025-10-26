const express = require('express');
const bodyParser = require('body-parser');
const amqp = require('amqplib');

const app = express();
app.use(bodyParser.json());

const RABBIT_HOST = process.env.RABBIT_HOST || 'rabbitmq';
const RABBIT_PORT = process.env.RABBIT_PORT || '5672';
const RABBIT_USER = process.env.RABBIT_USER || 'guest';
const RABBIT_PASS = process.env.RABBIT_PASS || 'guest';

const RABBIT_URL = `amqp://${RABBIT_USER}:${RABBIT_PASS}@${RABBIT_HOST}:${RABBIT_PORT}`;
const ORDER_QUEUE = 'orders';

let channel = null;
let connection = null;

/**
 * Connects to RabbitMQ with retry mechanism
 */
async function connectRabbit(retries = 10, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`🔄 Attempting to connect to RabbitMQ at ${RABBIT_URL} (try ${i + 1}/${retries})`);
      connection = await amqp.connect(RABBIT_URL);

      connection.on('error', (err) => {
        console.error('❌ RabbitMQ connection error:', err.message);
      });

      connection.on('close', () => {
        console.error('⚠️ RabbitMQ connection closed! Reconnecting...');
        setTimeout(connectRabbit, delay);
      });

      channel = await connection.createChannel();
      await channel.assertQueue(ORDER_QUEUE, { durable: true });

      console.log('✅ Connected to RabbitMQ and waiting for messages...');

      channel.consume(ORDER_QUEUE, (msg) => {
        if (msg) {
          try {
            const content = JSON.parse(msg.content.toString());
            console.log('📩 Received message:', content);

            if (content.event === 'order.created') {
              console.log(`📦 Sending notification for new order ${content.data.id}`);
            }

            channel.ack(msg);
          } catch (err) {
            console.error('⚠️ Error processing message:', err.message);
            channel.nack(msg, false, false);
          }
        }
      });
      return;
    } catch (err) {
      console.error(`⚠️ RabbitMQ connect failed (${err.message}). Retrying in ${delay / 1000}s...`);
      await new Promise((res) => setTimeout(res, delay));
    }
  }

  console.error('❌ Could not connect to RabbitMQ after multiple attempts. Exiting.');
  process.exit(1);
}

connectRabbit();

app.get('/health', (req, res) =>
  res.json({ status: 'ok', service: 'notification-service' })
);

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`🚀 Notification service running on port ${PORT}`));
