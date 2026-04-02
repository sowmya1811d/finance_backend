# Finance Dashboard Backend

A RESTful backend API for a finance dashboard system with role-based access control, built with **Node.js**, **Express**, and **MongoDB**.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup & Running](#setup--running)
- [Roles & Permissions](#roles--permissions)
- [API Overview](#api-overview)
- [Assumptions & Design Decisions](#assumptions--design-decisions)
- [Optional Enhancements Included](#optional-enhancements-included)

---

## Tech Stack

| Layer        | Choice                        |
|--------------|-------------------------------|
| Runtime      | Node.js                       |
| Framework    | Express.js                    |
| Database     | MongoDB (via Mongoose)        |
| Auth         | JWT (jsonwebtoken + bcryptjs) |
| Validation   | express-validator             |
| API Docs     | Swagger (swagger-jsdoc + swagger-ui-express) |

---

## Project Structure

```
finance-backend/
├── src/
│   ├── app.js                    # Entry point — wires middleware, routes, error handler
│   ├── config/
│   │   └── db.js                 # MongoDB connection
│   ├── models/
│   │   ├── User.js               # User schema (name, email, password, role, status)
│   │   └── Transaction.js        # Transaction schema with soft-delete support
│   ├── controllers/
│   │   ├── authController.js     # register, login, getMe
│   │   ├── userController.js     # CRUD for users (admin only)
│   │   ├── transactionController.js  # CRUD + filter/search/pagination
│   │   └── dashboardController.js    # Aggregated analytics endpoints
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── transactionRoutes.js
│   │   └── dashboardRoutes.js
│   ├── middleware/
│   │   ├── auth.js               # protect (JWT verify) + authorize (role check)
│   │   ├── validate.js           # express-validator error formatter
│   │   └── errorHandler.js       # Centralized error handling
│   ├── swagger/
│   │   └── swaggerConfig.js      # Swagger/OpenAPI spec config
│   └── utils/
│       └── seeder.js             # Seeds 3 users + 30 transactions for testing
├── .env.example
├── .gitignore
└── package.json
```

---

## Setup & Running

### 1. Prerequisites

- Node.js v18+
- MongoDB running locally (or a MongoDB Atlas URI)

### 2. Install Dependencies

```bash
cd finance-backend
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/finance_db
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

### 4. Seed Sample Data (Optional)

```bash
npm run seed
```

This creates 3 pre-built users you can log in with immediately:

| Email                  | Password    | Role     |
|------------------------|-------------|----------|
| admin@finance.com      | password123 | admin    |
| analyst@finance.com    | password123 | analyst  |
| viewer@finance.com     | password123 | viewer   |

### 5. Start the Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server runs at: `http://localhost:5000`  
Swagger Docs at: `http://localhost:5000/api-docs`

---

## Roles & Permissions

| Action                          | Viewer | Analyst | Admin |
|---------------------------------|:------:|:-------:|:-----:|
| Login / Register                |   ✅   |   ✅    |  ✅   |
| View transactions               |   ✅   |   ✅    |  ✅   |
| View recent activity            |   ✅   |   ✅    |  ✅   |
| View summary / analytics        |   ❌   |   ✅    |  ✅   |
| View category totals            |   ❌   |   ✅    |  ✅   |
| View monthly trends             |   ❌   |   ✅    |  ✅   |
| Create / Update / Delete txns   |   ❌   |   ❌    |  ✅   |
| Manage users (CRUD)             |   ❌   |   ❌    |  ✅   |

Access control is enforced server-side via the `authorize(...roles)` middleware on every route. Role claims in the JWT are always verified against the live database record, so changing a user's role in the DB takes effect immediately.

---

## API Overview

### Auth  `POST /api/auth/...`

| Method | Endpoint            | Description              | Auth Required |
|--------|---------------------|--------------------------|:-------------:|
| POST   | /api/auth/register  | Register a new user      | No            |
| POST   | /api/auth/login     | Login, receive JWT token | No            |
| GET    | /api/auth/me        | Get current user profile | Yes           |

### Users  `GET|PATCH|DELETE /api/users/...`  *(admin only)*

| Method | Endpoint        | Description                  |
|--------|-----------------|------------------------------|
| GET    | /api/users      | List users (filter, search, paginate) |
| GET    | /api/users/:id  | Get user by ID               |
| PATCH  | /api/users/:id  | Update name, role, or status |
| DELETE | /api/users/:id  | Delete a user                |

### Transactions  `POST /api/transactions/...`

| Method | Endpoint               | Description                        | Min Role |
|--------|------------------------|------------------------------------|----------|
| POST   | /api/transactions      | Create transaction                 | admin    |
| GET    | /api/transactions      | List with filters & pagination     | viewer   |
| GET    | /api/transactions/:id  | Get by ID                          | viewer   |
| PATCH  | /api/transactions/:id  | Update transaction                 | admin    |
| DELETE | /api/transactions/:id  | Soft-delete transaction            | admin    |

**GET /api/transactions** supports these query params:
- `type` — `income` or `expense`
- `category` — e.g. `salary`, `rent`, `groceries`
- `startDate` / `endDate` — ISO 8601 date range
- `search` — searches notes and category fields
- `page`, `limit` — pagination (default: page 1, limit 10)
- `sortBy` — `date`, `amount`, or `createdAt`
- `sortOrder` — `asc` or `desc`

### Dashboard  `GET /api/dashboard/...`

| Method | Endpoint                        | Description                         | Min Role |
|--------|---------------------------------|-------------------------------------|----------|
| GET    | /api/dashboard/summary          | Total income, expenses, net balance | analyst  |
| GET    | /api/dashboard/category-totals  | Totals grouped by category & type   | analyst  |
| GET    | /api/dashboard/monthly-trends   | Income vs expense per month         | analyst  |
| GET    | /api/dashboard/recent           | Recent N transactions               | viewer   |

---

## Assumptions & Design Decisions

**Roles defined by the system, not user-chosen at runtime**  
During registration, a `role` field can be supplied (useful for seeding/testing). In a real deployment you'd restrict this to admin-only user creation.

**Soft delete for transactions**  
Transactions are never truly removed — the `isDeleted` flag is set to `true` and a Mongoose pre-query hook silently filters them out. This preserves financial audit history.

**Password never returned**  
The User schema uses `select: false` on the password field, and `toJSON()` strips it before any response. Passwords are hashed with bcrypt (12 rounds).

**JWT contains only user ID**  
The token payload is minimal (`{ id }`). Role and status are always fetched fresh from the database on each request, so permission changes apply immediately without needing a new token.

**Fixed category list**  
Categories are an enum on the Transaction model (`salary`, `freelance`, `investment`, `rent`, `utilities`, `groceries`, `transport`, `healthcare`, `entertainment`, `education`, `other`). This keeps aggregations predictable.

**Error handling is centralized**  
All controllers pass errors to `next(error)`. The `errorHandler` middleware maps Mongoose errors, JWT errors, and duplicate key errors to appropriate HTTP status codes and clean JSON responses.

---

## Optional Enhancements Included

- **JWT Authentication** — stateless auth with bcrypt-hashed passwords
- **Pagination & Search** — all list endpoints support `page`, `limit`, and `search`
- **Soft Delete** — transactions are flagged deleted, not destroyed
- **Swagger/OpenAPI Docs** — interactive docs at `/api-docs`
- **Seeder Script** — `npm run seed` populates ready-to-use test data
- **Health Check** — `GET /health` for uptime monitoring

---

## Error Response Format

All errors follow a consistent shape:

```json
{
  "success": false,
  "message": "Descriptive error message here",
  "errors": [
    { "field": "email", "message": "Valid email is required" }
  ]
}
```

`errors` array is only present on validation failures (HTTP 422).
