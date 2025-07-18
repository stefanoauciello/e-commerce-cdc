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

## Detailed Project Guide

### Architecture and Components
1. **PostgreSQL 16**
   - Database that stores e-commerce data
   - Configured with `wal_level = logical` to enable CDC
   - Contains tables for products, orders, and order items

2. **Debezium 2.5**
   - CDC connector that captures changes from PostgreSQL transaction log
   - Configured to monitor specific tables
   - Publishes changes to Kafka topics

3. **Kafka 4.0 (KRaft)**
   - Message broker that stores and distributes change events
   - Uses KRaft mode (without ZooKeeper)
   - Manages topics for each monitored table

4. **Backend Node.js**
   - Kafka consumer that processes messages
   - Sends real-time updates via WebSocket
   - Enriches messages with additional information

5. **Frontend React**
   - Dashboard that displays real-time updates
   - Connects to the backend via WebSocket
   - Formats and displays data based on event type

6. **Kafka UI**
   - Web interface for monitoring Kafka topics and connectors
   - Useful for debugging and verifying system operation

### CDC Process Flow
1. **Event Generation**
   - Data changes (inserts, updates, deletions) are executed in the PostgreSQL database
   - PostgreSQL records these changes in the Write-Ahead Log (WAL)

2. **Change Capture**
   - Debezium reads the WAL through logical decoding
   - Filters changes based on configured tables (`products`, `orders`, `order_items`)
   - Converts changes into structured events

3. **Publication to Kafka**
   - Events are published to specific Kafka topics:
     - `ecommerce.public.products` - For product stock changes
     - `ecommerce.public.orders` - For new orders
     - `ecommerce.public.order_items` - For order items

4. **Event Consumption**
   - The Node.js backend subscribes to Kafka topics
   - Processes received events and enriches them with metadata

5. **Real-time Distribution**
   - Processed events are sent to connected clients via WebSocket
   - The React frontend receives events and updates the user interface

## Step-by-Step Instructions to Simulate CDC

### Prerequisites
- Docker and Docker Compose installed
- PowerShell (Windows) or Bash (Unix/Linux/macOS)
- Ports 3000, 4000, 5432, 8080, 8083, 9092, and 9094 available on your system

### System Startup

#### For Windows (PowerShell)
1. **Start all services**
   ```powershell
   docker compose up -d
   ```

2. **Register the Debezium connector** (first time only)
   ```powershell
   .\db-init\register-debezium.ps1
   ```
   The script waits for Kafka Connect to become available and has a timeout of about 2 minutes.

#### For Unix/Linux/macOS
1. **Start all services**
   ```bash
   docker compose up -d
   ```

2. **Register the Debezium connector** (first time only)
   ```bash
   chmod +x db-init/register-debezium.sh
   ./db-init/register-debezium.sh
   ```
   The script waits for Kafka Connect to become available (requires curl or wget) and has a timeout of about 2 minutes.

### Verifying Operation

1. **Access the Dashboard**
   - Open [http://localhost:3000](http://localhost:3000) in your browser
   - Initially, there will be no events displayed

2. **Monitor Service Logs** (optional)
   ```
   docker compose logs -f debezium
   docker compose logs -f backend
   ```

3. **Access Kafka UI** (optional)
   - Open [http://localhost:8080](http://localhost:8080) in your browser
   - Verify that Kafka topics have been created
   - Check that the Debezium connector is active

### Simulating CDC Events

1. **Connect to PostgreSQL Database**
   ```
   docker exec -it postgres psql -U postgres -d ecommerce
   ```

2. **Insert a New Order**
   Execute the following SQL query:
   ```sql
   WITH new_order AS (
       INSERT INTO orders DEFAULT VALUES RETURNING id
   )
   INSERT INTO order_items (order_id, product_id, quantity)
   SELECT id, 1, 2 FROM new_order;
   ```
   This inserts a new order and reduces the stock of product with ID 1 by 2 units.

3. **Directly Update a Product's Stock**
   ```sql
   UPDATE products SET stock = stock + 5 WHERE id = 2;
   ```
   This increases the stock of product with ID 2 by 5 units.

4. **Observe Real-time Events**
   - Return to the React dashboard [http://localhost:3000](http://localhost:3000)
   - Observe the update events appearing in real-time
   - Notice how previous and current stock values are displayed

### Troubleshooting

1. **Debezium Connector Not Registering**
   - Check Debezium logs: `docker compose logs debezium`
   - Make sure Kafka Connect is running
   - Try manual registration:
     ```
     curl -X POST -H "Content-Type: application/json" --data @db-init/connector-config.json http://localhost:8083/connectors
     ```

2. **No Events Displayed on Dashboard**
   - Verify all services are running: `docker compose ps`
   - Check backend logs: `docker compose logs backend`
   - Ensure the Debezium connector is properly configured
   - Verify that database changes were executed correctly

3. **Errors in Kafka Logs**
   - Restart Kafka: `docker compose restart kafka`
   - Verify topics were created: `docker exec -it kafka kafka-topics.sh --list --bootstrap-server localhost:9092`

4. **System Reset**
   - To completely restart the system:
     ```
     docker compose down
     docker compose up -d
     ./db-init/register-debezium.ps1  # or .sh for Unix/Linux/macOS
     ```

## Topic Naming

All CDC events are captured on Kafka topics with a consistent naming pattern:
`ecommerce.public.[table_name]`. The current configuration monitors the following topics:
- `ecommerce.public.products` - For product stock changes
- `ecommerce.public.orders` - For new orders
- `ecommerce.public.order_items` - For order items

![Dashboard](docs/dashboard.gif)
