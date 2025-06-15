import { Kafka } from 'kafkajs';
import { WebSocketServer } from 'ws';
import http from 'http';
import dotenv from 'dotenv';

dotenv.config();

const broker = process.env.KAFKA_BROKER ?? 'localhost:9092';
const kafka = new Kafka({ brokers: [broker] });
const consumer = kafka.consumer({ groupId: 'dashboard' });
const admin = kafka.admin();
const topic = 'public.orders';

// Object to store stock quantities
const stock: Record<string, number> = {};

// Basic HTTP server (used only to bind WebSocket)
const server = http.createServer((_req, res) => {
  res.writeHead(404);
  res.end();
});

// WebSocket server attached to the HTTP server
const wss = new WebSocketServer({ server });

// Send updated stock to all connected WebSocket clients
function broadcast() {
  const data = JSON.stringify(stock);
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(data);
    }
  }
}

// Ensure the Kafka topic exists; create it if not
async function ensureTopic() {
  await admin.connect();
  const topics = await admin.listTopics();
  if (!topics.includes(topic)) {
    console.log(`Topic "${topic}" not found, creating...`);
    await admin.createTopics({
      topics: [{ topic }],
      waitForLeaders: true,
    });
    console.log(`Topic "${topic}" created.`);
  } else {
    console.log(`Topic "${topic}" already exists.`);
  }
  await admin.disconnect();
}

// Set up the Kafka consumer
async function startKafkaConsumer() {
  await ensureTopic();
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ message }: any) => {
      const value = message.value?.toString();
      if (!value) return;

      try {
        const event = JSON.parse(value);
        const after = event.after ?? {};
        const productId = after.product_id;
        const qty = after.quantity ?? 0;

        if (productId) {
          stock[productId] = (stock[productId] || 0) - qty;
          broadcast();
        }
      } catch (err) {
        console.error('Error parsing Kafka message:', err);
      }
    }
  });

  console.log(`Kafka consumer started and listening on topic "${topic}".`);
}

// Start the HTTP/WebSocket server
server.listen(4000, () => {
  console.log('HTTP/WS server listening on port 4000');
});

// Start the Kafka consumer and handle errors
startKafkaConsumer().catch((err) => {
  console.error('Error during Kafka consumer initialization:', err);
});
