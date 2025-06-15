import { useEffect, useState } from 'react';
import WebSocket from 'isomorphic-ws';
import { motion } from 'framer-motion';

export default function App() {
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:4000');

    ws.onmessage = (ev) => {
      const msg = ev.data.toString();
      setMessages((prev) => [...prev, msg]);
    };

    return () => ws.close();
  }, []);

  return (
      <div>
        <h1>WebSocket Messages</h1>
        {messages.map((msg, idx) => (
            <motion.div key={idx} animate={{ scale: 1 }} initial={{ scale: 0.9 }}>
              {msg}
            </motion.div>
        ))}
      </div>
  );
}
