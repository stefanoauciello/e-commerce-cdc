import { Kafka } from 'kafkajs';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';

dotenv.config();

const broker = process.env.KAFKA_BROKER ?? 'localhost:9092';
const kafka = new Kafka({ brokers: [broker] });
const consumer = kafka.consumer({ groupId: 'dashboard' });
const topic = 'public.orders';

const stock: Record<string, number> = {};
const wss = new WebSocketServer({ port: 4000 });

function broadcast() {
  const data = JSON.stringify(stock);
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(data);
    }
  }
}

async function main() {
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ message }: any) => {
      const value = message.value?.toString();
      if (!value) return;
      console.log(value);
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
        console.error('Failed to parse message', err);
      }
    }
  });

  console.log('WebSocket server running on port 4000');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
