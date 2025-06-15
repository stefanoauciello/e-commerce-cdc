# E-commerce CDC Demo

```
PostgreSQL 16 --(logical decoding)--> Debezium 2.5 --> Kafka 4.0 (KRaft)
                    ▲                        │
                    │                        ▼
React dashboard <-- WebSocket -- Node 20 LTS consumer
```

This project shows a minimal change-data-capture pipeline. Product stock
changes in PostgreSQL are streamed through Debezium into Kafka and pushed to a
React dashboard via WebSockets.

## Quick start

```bash
# start everything
docker compose up -d
# register connector (once)
chmod +x db-init/register-debezium.sh
./db-init/register-debezium.sh
# the script waits for Kafka Connect (curl or wget must be available)
# and times out after ~2 minutes; check `docker compose logs debezium` if it fails
```

Place an order using `psql` to watch stock updates live:

```sql
WITH new_order AS (
INSERT INTO orders DEFAULT VALUES RETURNING id
    )
INSERT INTO order_items (order_id, product_id, quantity);
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

![Dashboard](docs/dashboard.gif)
