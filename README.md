# Mockstagram Data Pipeline

A distributed system for tracking and analyzing influencer follower counts over time, built with TypeScript, Kafka, and TimescaleDB.

## Project Structure

```
.
├── packages/
│   └── shared-utils/     # Shared utilities used by all apps
├── apps/
│   ├── scheduler/        # Service for scheduling influencer data fetches
│   ├── fetcher/         # Service for fetching influencer data from API
│   └── result-handler/  # Service for processing and storing results
├── volumes/             # Configuration files for supporting services
├── package.json         # Root package.json with workspace configuration
├── tsconfig.json       # Root TypeScript configuration
└── docker-compose.yml  # Docker Compose configuration
```

## Infrastructure Components

The system includes the following components:

- **Core Services**
  - Scheduler: Schedules data fetches for influencers
  - Fetcher: Fetches influencer data from the API
  - Result Handler: Processes and stores results in TimescaleDB

- **Message Broker**
  - Kafka: Handles message queuing between services
  - Kafdrop: Web UI for Kafka topic inspection (http://localhost:9000)

- **Database**
  - TimescaleDB: Time-series database for storing influencer metrics
  - Port: 6432 (PostgreSQL protocol)

- **Monitoring Stack**
  - Prometheus: Metrics collection (http://localhost:9090)
  - Grafana: Metrics visualization (http://localhost:3000)
  - Jaeger: Distributed tracing (http://localhost:16686)

- **Logging Stack**
  - Fluentd: Log aggregation
  - Elasticsearch: Log storage
  - Kibana: Log visualization (http://localhost:5601)

## Prerequisites

- Node.js 18 or later
- Yarn
- Docker and Docker Compose

## Test Coverage

**Note**: This project currently include test case for only result-handler. The following areas would benefit from test coverage:

- Unit tests for individual service components
- Integration tests for service interactions
- End-to-end tests for the complete data pipeline
- Performance tests for batch processing
- Error handling and recovery scenarios
- Database operations and data consistency

## Service Details

### Scheduler Service
- Port: 8081
- Metrics: Available at /metrics endpoint
- Monitors active influencers and schedules data fetches

### Fetcher Service
- Port: 8082
- Metrics: Available at /metrics endpoint
- Fetches influencer data from the API
- Publishes results to Kafka topics

### Result Handler Service
- Port: 8083
- Metrics: Available at /metrics endpoint
- Processes fetched data and stores in TimescaleDB
- Handles failed operations with DLQ

## Development

For local development without Docker:

1. Install dependencies:
   ```bash
   yarn install
   ```

2. Build the shared utilities:
   ```bash
   yarn workspace @monorepo/shared-utils build
   ```

3. Build each service:
   ```bash
   yarn workspace @monorepo/scheduler build
   yarn workspace @monorepo/fetcher build
   yarn workspace @monorepo/result-handler build
   ```
4. Copy the .env.example to .env and fill the values for all the services.

5. Use docker or cloud instances for the non-app services like kafka, timescaledb.

6. In separate terminals, start each app in development mode:
   ```bash
   yarn workspace @monorepo/scheduler start
   yarn workspace @monorepo/fetcher start
   yarn workspace @monorepo/result-handler start
   ```

For local development with docker
1. Start the entire stack using Docker Compose:
   ```bash
   docker-compose up
   ```

## Monitoring and Observability

The system includes comprehensive monitoring and observability features:

- **Metrics**: Prometheus collects metrics from all services
- **Tracing**: Jaeger provides distributed tracing
- **Logging**: Centralized logging with Elasticsearch and Kibana
- **Visualization**: Grafana dashboards for metrics visualization

## Building for Production
TODO
