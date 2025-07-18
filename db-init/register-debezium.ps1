# PowerShell script to register Debezium connector
# Windows-compatible alternative to register-debezium.sh

$CONNECT_URL = if ($env:CONNECT_URL) { $env:CONNECT_URL } else { "http://localhost:8083" }

Write-Host "Waiting for Kafka Connect at $CONNECT_URL ..."

# Function to check if Kafka Connect is ready
function Test-KafkaConnectReady {
    try {
        $response = Invoke-WebRequest -Uri "$CONNECT_URL/connectors" -Method GET -UseBasicParsing -ErrorAction SilentlyContinue
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

# Wait for Kafka Connect to become available
$retries = 40
$ready = $false

for ($i = 0; $i -lt $retries; $i++) {
    if (Test-KafkaConnectReady) {
        $ready = $true
        break
    }
    Write-Host "." -NoNewline
    Start-Sleep -Seconds 3
}

if (-not $ready) {
    Write-Host "`nKafka Connect did not become ready in time" -ForegroundColor Red
    exit 1
}

Write-Host "`nRegistering Debezium connector"

# JSON payload for the connector configuration
$payload = @"
{
  "name": "postgres-ecommerce-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "plugin.name": "pgoutput",
    "database.hostname": "postgres",
    "database.port": "5432",
    "database.user": "myuser",
    "database.password": "mypassword",
    "database.dbname": "mydb",
    "database.server.name": "ecommerce",
    "slot.name": "ecommerce_slot",
    "publication.autocreate.mode": "filtered",
    "table.include.list": "public.products,public.orders,public.order_items",
    "topic.prefix": "ecommerce",
    "schema.include.list": "public",
    "topic.creation.default.replication.factor": 1,
    "topic.creation.default.partitions": 1,
    "topic.creation.default.cleanup.policy": "delete"
  }
}
"@

# Register the connector
try {
    $response = Invoke-WebRequest -Uri "$CONNECT_URL/connectors" -Method POST -Body $payload -ContentType "application/json" -UseBasicParsing
    Write-Host "Connector registered successfully!" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    # Check if the error is because the connector already exists (409 Conflict)
    if ($_.Exception.Response.StatusCode -eq 409) {
        Write-Host "Connector 'postgres-ecommerce-connector' already exists. No action needed." -ForegroundColor Yellow
        # This is not an error condition, so exit with success
        exit 0
    } else {
        Write-Host "Failed to register connector: $_" -ForegroundColor Red
        exit 1
    }
}
