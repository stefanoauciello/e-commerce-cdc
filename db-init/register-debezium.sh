#!/bin/bash
set -e
CONNECT_URL=${CONNECT_URL:-http://localhost:8083}

echo "Waiting for Kafka Connect at $CONNECT_URL ..."
MAX_ATTEMPTS=40
for i in $(seq 1 $MAX_ATTEMPTS); do
  if curl -sf "$CONNECT_URL/connectors" >/dev/null; then
    break
  fi
  printf '.'
  sleep 3
done
if ! curl -sf "$CONNECT_URL/connectors" >/dev/null; then
  echo "\nKafka Connect did not become ready in time" >&2
  exit 1
fi

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
      "schema.include.list": "public"
    }
  }' \
  "$CONNECT_URL/connectors"
