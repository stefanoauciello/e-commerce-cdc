#!/bin/sh
set -e
CONNECT_URL=${CONNECT_URL:-http://localhost:8083}

if command -v curl >/dev/null; then
  http_get() { curl -sf "$1" >/dev/null; }
  http_post() { curl -s -X POST -H "Content-Type: application/json" --data "$1" "$CONNECT_URL/connectors"; }
elif command -v wget >/dev/null; then
  http_get() { wget -qO- "$1" >/dev/null; }
  http_post() { wget -qO- --header='Content-Type: application/json' --post-data="$1" "$CONNECT_URL/connectors" >/dev/null; }
else
  echo "Neither curl nor wget is available" >&2
  exit 1
fi

echo "Waiting for Kafka Connect at $CONNECT_URL ..."
for i in {1..40}; do
  if http_get "$CONNECT_URL/connectors"; then
    break
  fi
  printf '.'
  sleep 3
done
if ! http_get "$CONNECT_URL/connectors"; then
  echo "\nKafka Connect did not become ready in time" >&2
  exit 1
fi

echo "Registering Debezium connector"
http_post '{
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
}'
