#!/bin/bash
set -e
CONNECT_URL=${CONNECT_URL:-http://localhost:8083}

echo "Waiting for Kafka Connect..."
until curl -sf "$CONNECT_URL/connectors" >/dev/null; do
  sleep 3
done

echo "Registering Debezium connector"
curl -s -X POST -H "Content-Type: application/json" \
  --data '{
    "name": "postgres-ecommerce-connector",
    "config": {
      "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
      "plugin.name": "pgoutput",
      "database.hostname": "postgres",
      "database.port": "5432",
      "database.user": "postgres",
      "database.password": "postgres",
      "database.dbname": "ecommerce",
      "database.server.name": "ecommerce",
      "slot.name": "ecommerce_slot",
      "publication.autocreate.mode": "filtered",
      "topic.prefix": "public",
      "schema.include": "public"
    }
  }' \
  "$CONNECT_URL/connectors"
