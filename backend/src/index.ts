import { Kafka } from 'kafkajs';
import { WebSocketServer } from 'ws';
import http from 'http';
import dotenv from 'dotenv';

dotenv.config();

const broker = process.env.KAFKA_BROKER ?? 'localhost:9092';
console.log(`Connecting to Kafka broker at: ${broker}`);

const kafka = new Kafka({
  brokers: [broker],
  retry: {
    initialRetryTime: 300,
    retries: 10
  }
});
const consumer = kafka.consumer({ groupId: 'dashboard' });
const admin = kafka.admin();

// Subscribe to both orders and products topics to capture all relevant events
// Include both the expected topic names with 'ecommerce.' prefix and without it
const topics = [
  'ecommerce.public.orders', 'ecommerce.public.products', 'ecommerce.public.order_items'
];

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
  try {
    await consumer.connect();
    console.log('Connected to Kafka');

    // Subscribe to all topics
    for (const topic of topics) {
      await consumer.subscribe({ topic, fromBeginning: true });
      console.log(`Subscribed to topic: ${topic}`);
    }

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const value = message.value?.toString();
        if (!value) return;

        try {
          // Try to parse JSON for pretty formatting
          const parsed = JSON.parse(value);
          console.log(`Received message from topic ${topic}:`, parsed);

          // Add topic information to the message
          const enrichedMessage = {
            topic,
            data: parsed,
            timestamp: new Date().toISOString()
          };

          broadcastRawMessage(JSON.stringify(enrichedMessage));
        } catch (error) {
          console.error(`Error processing message from topic ${topic}:`, error);
          // Not JSON: send raw string with topic info
          broadcastRawMessage(`Topic ${topic}: ${value}`);
        }
      }
    });

    console.log(`Kafka consumer started and listening on topics: ${topics.join(', ')}`);
  } catch (error) {
    console.error('Failed to start Kafka consumer:', error);
    // Retry after a delay
    console.log('Retrying in 5 seconds...');
    setTimeout(startKafkaConsumer, 5000);
  }
}

// Start the HTTP/WebSocket server
server.listen(4000, () => {
  console.log('WebSocket server running on port 4000');
});

// Start the Kafka consumer and handle errors
startKafkaConsumer().catch((err) => {
  console.error('Error during Kafka consumer initialization:', err);
});
