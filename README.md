# Tracker

An experimental logistics API built to test and explore Uber's H3 geospatial indexing library. This project implements a complete order management system with real-time driver tracking, role-based access control, and geospatial order matching.

## Experimental Project

**This is an experimental API I created for learning and testing purposes. It has no tests and should not be used in production without proper testing and validation.**

## Features

- **Role-Based Access Control (RBAC)** - Multi-role system for DRIVERS and CUSTOMERS with JWT authentication
- **Order Management** - Customers can create orders with pickup/dropoff locations
- **Driver Operations** - Drivers can view available orders, assign themselves, and track deliveries
- **Real-time Ping Tracking** - Driver location updates with H3 hexagonal geospatial indexing
- **Vehicle Management** - Drivers can register and manage their vehicles
- **Idempotency** - Safe order creation with idempotency keys
- **Redis Caching** - Performance optimization with role detail caching

## Tech Stack

- **Framework**: NestJS
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis
- **Geospatial**: Uber H3
- **Authentication**: JWT RS256 with HTTP-only cookies
- **Validation**: class-validator & class-transformer

## Architecture

### Modules

- **Auth Module** - User registration, login, JWT token management
- **Customers Module** - Order creation and order history for customers
- **Drivers Module** - Vehicle management, order assignment, driver ping tracking
- **Orders Module** - Core order logic, H3 geospatial indexing, driver matching
- **Vehicles Module** - Vehicle registration and management

### Key Components

- **RolesGuard** - Custom guard for role verification with Redis caching
- **AuthGuard** - JWT authentication with cookie-based tokens
- **OrderIdempotencyInterceptor** - Idempotency handling for order creation
- **Prisma Error Filters** - Global error handling for database operations

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user (supports multi-role)
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user

### Customers (Role: CUSTOMER)

- `POST /api/customers/orders` - Create new order (idempotent)
- `GET /api/customers/orders` - Get customer order history

### Drivers (Role: DRIVER)

- `POST /api/drivers/vehicles` - Register vehicle
- `GET /api/drivers/vehicles` - Get driver vehicles
- `POST /api/drivers/orders/:orderId/assign` - Assign driver to order
- `GET /api/drivers/orders` - Get driver order history
- `POST /api/drivers/orders/:orderId/ping` - Submit driver location ping

### Orders (Role: DRIVER)

- `GET /api/orders` - Get available orders (driver-only)

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis
- Docker
- JWT RS256 key pair

### Installation

```bash
# install dependencies
npm install

# Set up env variables
cp .env.example .env

# start docker containers
docker compose up -d

# generate prisma client
npx prisma generate

# run migrations
npx prisma migrate dev

# start development server
npm run start:dev
```

## Known Limitations

- No unit or integration tests
- No rate limiting
- WebSocket not implemented (uses HTTP polling)
- No monitoring/alerting
- No API documentation (Swagger/OpenAPI)
