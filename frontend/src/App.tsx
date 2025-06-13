import { useEffect, useState } from 'react';
import WebSocket from 'isomorphic-ws';
import { motion } from 'framer-motion';

interface Stock {
  [key: string]: number;
}

export default function App() {
  const [stock, setStock] = useState<Stock>({});

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:4000');
    ws.onmessage = (ev) => {
      const data = JSON.parse(ev.data.toString());
      setStock(data);
    };
    return () => ws.close();
  }, []);

  return (
    <div>
      <h1>Product Stock</h1>
      {Object.entries(stock).map(([id, qty]) => (
        <motion.div key={id} animate={{ scale: 1 }} initial={{ scale: 0.9 }}>
          <strong>{id}</strong>: {qty}
        </motion.div>
      ))}
    </div>
  );
}
