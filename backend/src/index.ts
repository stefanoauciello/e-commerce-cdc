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

// Basic HTTP server (used only to bind WebSocket)
const server = http.createServer((_req, res) => {
  res.writeHead(404);
  res.end();
});

// WebSocket server attached to the HTTP server
const wss = new WebSocketServer({ server });

// Send a message to all connected WebSocket clients
function broadcastRawMessage(message: string) {
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  }
}

// Set up the Kafka consumer
async function startKafkaConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const value = message.value?.toString();
      if (!value) return;

      try {
        // Try to parse JSON for pretty formatting
        const parsed = JSON.parse(value);
        broadcastRawMessage(JSON.stringify(parsed));
      } catch {
        // Not JSON: send raw string
        broadcastRawMessage(value);
      }
    }
  });

  console.log(`Kafka consumer started and listening on topic "${topic}".`);
}

// Start the HTTP/WebSocket server
server.listen(4000, () => {
  console.log('WebSocket server running on port 4000');
});

// Start the Kafka consumer and handle errors
startKafkaConsumer().catch((err) => {
  console.error('Error during Kafka consumer initialization:', err);
});
