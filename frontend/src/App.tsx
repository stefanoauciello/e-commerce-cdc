import { useEffect, useState } from 'react';
import WebSocket from 'isomorphic-ws';
import { motion } from 'framer-motion';

// Define types for our messages
interface KafkaMessage {
  topic: string;
  data: any;
  timestamp: string;
}

export default function App() {
  const [messages, setMessages] = useState<KafkaMessage[]>([]);

  useEffect(() => {
    // Get the API URL from environment variables or use a fallback
    // For Vite, environment variables must start with VITE_
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';

    // Convert http:// to ws:// or https:// to wss://
    const wsUrl = apiUrl.replace(/^http/, 'ws');

    console.log('Connecting to WebSocket at:', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (ev) => {
      try {
        const msgString = ev.data.toString();
        const msg = JSON.parse(msgString) as KafkaMessage;
        console.log('Received message:', msg);
        setMessages((prev) => [...prev, msg]);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onopen = () => {
      console.log('WebSocket connection established');
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };

    return () => ws.close();
  }, []);


  return (
    <div className="app-container">
      <h1>E-commerce Dashboard</h1>
      <p>Real-time updates from database via Kafka</p>

      <div className="messages-container">
        {messages.length === 0 ? (
          <p>Waiting for events... Try placing an order in the database.</p>
        ) : (
          messages.map((msg, idx) => (
            <motion.div
              key={idx}
              className="message-card"
              animate={{ scale: 1, opacity: 1 }}
              initial={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="message-header">
                <span className="topic-badge">{msg.topic}</span>
                <span className="timestamp">{new Date(msg.timestamp).toLocaleTimeString()}</span>
              </div>
              <div className="message-body">
                <pre>{JSON.stringify(msg, null, 2)}</pre>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
