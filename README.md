# E-commerce CDC Demo

```
PostgreSQL 16 --(logical decoding)--> Debezium 3.1.0.Final --> Kafka 4.0 (KRaft)
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
# the script waits for Kafka Connect and times out after ~2 minutes
# check `docker compose logs debezium` if it fails
```

Place an order using `psql` to watch stock updates live:

```sql
INSERT INTO orders DEFAULT VALUES RETURNING id; -- note the id
INSERT INTO order_items VALUES (<id>, 1, 2);
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

![Dashboard](docs/dashboard.gif)
