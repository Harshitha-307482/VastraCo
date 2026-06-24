# VastraCo — Microservice-based Indian Fashion E-Commerce Platform

VastraCo is a full-stack Indian fashion e-commerce platform built using a robust, decoupled microservice architecture. The platform supports user registration and authentication, catalog browsing with dynamic filtering, real-time shopping cart management, and order placement.

---

## 💻 Tech Stack

### Frontend
- **React 18 & Vite**: Fast development and building of the Single Page Application (SPA).
- **Tailwind CSS**: Utility-first styling for a premium, responsive user interface.
- **React Router (v6)**: Declarative routing.
- **Axios**: Promised-based HTTP client for API communications.
- **Lucide React**: Modern iconography.

### Microservices
- **Node.js & Express.js**: Lightweight and fast backend services.
- **PostgreSQL**: Robust SQL database, containerized per service to ensure database isolation.
- **JWT (JSON Web Tokens)**: Secure token-based authentication across service boundaries.
- **Bcrypt**: Hashing user passwords securely.

### Infrastructure & Orchestration
- **Docker & Docker Compose**: Complete orchestration of databases and services.
- **Nginx**: Static asset serving and reverse-proxying of API traffic.

---

## 🏛️ System Architecture

All requests from the client's browser pass through **Nginx** (acting as a reverse proxy), routing traffic to the frontend static server or the appropriate backend microservice:

```
                  Browser (Port 3000)
                           │
                           ▼
                  Nginx Reverse Proxy
                           │
        ┌──────────────────┼──────────────────┐
        │ /api/users       │ /api/products    │ /api/orders
        ▼                  ▼                  ▼
   user-service     product-service     order-service
    (Port 3001)       (Port 3002)        (Port 3003)
        │                  │                  │
        ▼                  ▼                  ▼
    users-db          products-db         orders-db
  (PostgreSQL)       (PostgreSQL)       (PostgreSQL)
```

---

## 📁 Project Structure

The project code is modularly structured into separate service directories, each with its own Docker configuration:

```
VastraCo/
├── docker-compose.yml       # Orchestrates all services & databases
├── .env.example             # Template file for environment variables
├── frontend/                # React SPA & Nginx configuration
├── user-service/            # Authentication & User Profiles service
├── product-service/         # Product Catalog & DB Seeding service
└── order-service/           # Shopping Orders processing service
```

---

## 🔌 API Endpoints Reference

### 🔐 User Service (`user-service` — Port 3001)

| Method | Endpoint | Description | Auth Required |
|:---|:---|:---|:---|
| `POST` | `/api/auth/register` | Register a new customer | No |
| `POST` | `/api/auth/login` | Authenticate user & return JWT | No |
| `GET` | `/api/auth/me` | Fetch active user credentials | Yes (JWT) |
| `GET` | `/health` | Live check status | No |
| `GET` | `/ready` | Ready state check (DB connectivity) | No |

### 👕 Product Service (`product-service` — Port 3002)

| Method | Endpoint | Description | Auth Required |
|:---|:---|:---|:---|
| `GET` | `/api/categories` | List all available categories | No |
| `GET` | `/api/products` | Retrieve all products (supports query search/filtering) | No |
| `GET` | `/api/products/:id` | Get details & variants of a product | No |
| `GET` | `/health` | Live check status | No |
| `GET` | `/ready` | Ready state check (DB connectivity) | No |

### 📦 Order Service (`order-service` — Port 3003)

| Method | Endpoint | Description | Auth Required |
|:---|:---|:---|:---|
| `POST` | `/api/orders` | Checkout cart / Place a new order | Yes (JWT) |
| `GET` | `/api/orders` | Retrieve order history for logged-in user | Yes (JWT) |
| `GET` | `/health` | Live check status | No |
| `GET` | `/ready` | Ready state check (DB connectivity) | No |

---

## 🗄️ Database Schemas

Each microservice isolates its database schema to support scaling and independent deployment:

### 1. User Database (`users_db`)
#### Table: `users`
- `id` (UUID, Primary Key)
- `name` (VARCHAR)
- `email` (VARCHAR, Unique)
- `password_hash` (TEXT)
- `role` (VARCHAR, default `'customer'`)
- `created_at` (TIMESTAMP)

### 2. Product Database (`products_db`)
#### Table: `categories`
- `id` (SERIAL, Primary Key)
- `name` (VARCHAR)
- `slug` (VARCHAR, Unique)

#### Table: `products`
- `id` (UUID, Primary Key)
- `name` (VARCHAR)
- `description` (TEXT)
- `price` (NUMERIC)
- `category_id` (INTEGER, Foreign Key referencing `categories`)
- `brand` (VARCHAR)
- `image_url` (TEXT)
- `gender` (VARCHAR)
- `style` (VARCHAR)
- `occasion` (JSONB)
- `created_at` (TIMESTAMP)

#### Table: `product_variants`
- `id` (SERIAL, Primary Key)
- `product_id` (UUID, Foreign Key referencing `products`)
- `size` (VARCHAR)
- `color` (VARCHAR)
- `stock_quantity` (INTEGER)
- `sku` (VARCHAR, Unique)

### 3. Order Database (`orders_db`)
#### Table: `orders`
- `id` (UUID, Primary Key)
- `user_id` (UUID)
- `status` (VARCHAR, default `'pending'`)
- `total_amount` (NUMERIC)
- `shipping_address` (JSONB)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### Table: `order_items`
- `id` (SERIAL, Primary Key)
- `order_id` (UUID, Foreign Key referencing `orders`)
- `product_id` (UUID)
- `variant_id` (INTEGER)
- `product_name` (VARCHAR)
- `size` (VARCHAR)
- `color` (VARCHAR)
- `quantity` (INTEGER)
- `unit_price` (NUMERIC)

---

## 🚀 Setup & Running Guide

### Prerequisites
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed on your machine.
- [Node.js](https://nodejs.org/) (optional, only for running services locally outside Docker).

### Configuration
1. Clone the project and navigate to the project root directory.
2. Duplicate `.env.example` as `.env`:
   ```bash
   cp .env.example .env
   ```
3. Set your environment variables in `.env` or use the pre-configured defaults.

### Running with Docker Compose (Recommended)
Launch the entire system (Frontend, Microservices, and Databases) with a single command from the project root:

```bash
docker compose up --build -d
```

Once all containers are successfully built and run:
- **Frontend App**: Access via browser at [http://localhost:3000](http://localhost:3000)
- **User Database Seeding**: Creates a test user `customer@vastraco.com` and admin `admin@vastraco.com` (passwords: `password123` / `admin123`).
- **Product Catalog Seeding**: Automatically seeds ~215 high-quality products across 36 categories if the catalog contains fewer than 50 items at startup.

To stop the containers:
```bash
docker compose down
```

---

## 🛠️ Running Locally (Without Docker)

To run the services individually for development, make sure you have local instances of PostgreSQL running.

1. **Database Setup**: Create three PostgreSQL databases: `users_db`, `products_db`, and `orders_db`.
2. **Environment File**: Update `.env` config with local Postgres coordinates:
   ```env
   USER_DB_HOST=localhost
   PRODUCT_DB_HOST=localhost
   ORDER_DB_HOST=localhost
   # Use localhost ports if not proxying via Nginx
   PRODUCT_SERVICE_URL=http://localhost:3002
   USER_SERVICE_URL=http://localhost:3001
   ```
3. **Launch Microservices**:
   Run the following commands in three separate terminal windows:
   ```bash
   # User Service
   cd user-service && npm install && npm run dev
   
   # Product Service
   cd product-service && npm install && npm run dev
   
   # Order Service
   cd order-service && npm install && npm run dev
   ```
4. **Launch Frontend**:
   Run the following commands:
   ```bash
   cd frontend && npm install && npm run dev
   ```
   Open the application in your browser via Vite's local output (typically `http://localhost:5173`).
