import { useEffect, useState } from 'react';
import WebSocket from 'isomorphic-ws';
import { motion } from 'framer-motion';
import './App.css';

// Define types for our messages
interface KafkaMessage {
  topic: string;
  data: any;
  timestamp: string;
}

export default function App() {
  const [messages, setMessages] = useState<KafkaMessage[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  function toggle(idx: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  }

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
          messages.map((msg, idx) => {
            const formatted = JSON.stringify(msg, null, 2);
            const lines = formatted.split('\n');
            const preview = lines.slice(0, 3).join('\n');
            const isExpanded = expanded.has(idx);
            return (
              <motion.div
                key={idx}
                className="message-card"
                initial={{ y: 20, scale: 0.95, opacity: 0 }}
                animate={{ y: 0, scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, type: 'spring', stiffness: 120 }}
              >
                <div className="message-header">
                  <span className="counter">{idx + 1}</span>
                  <span className="topic-badge">{msg.topic}</span>
                  <span className="timestamp">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="message-body" onClick={() => toggle(idx)}>
                  <pre>{isExpanded ? formatted : preview + (lines.length > 3 ? '\n...' : '')}</pre>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
