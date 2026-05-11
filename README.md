# Employee Time Clock App

A full-stack employee time-tracking system built with Vue 3, Node.js, Express, and MySQL.

## Features

- Clock in / out and log breaks
- Per-day history table with inline notes
- Export history to CSV, XLS, or PDF
- Manager overtime approval queue
- Manager flagged-session review with time-entry corrections
- Admin user management (create, edit, deactivate, reset passwords)
- JWT authentication with silent token refresh

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vue 3, TypeScript, Tailwind CSS, Vite |
| Backend | Node.js, Express 5, TypeScript |
| Database | MySQL |
| ORM | Kysely |
| Validation | Zod (shared between client and server) |
| Auth | JWT (access token in-memory + refresh token in HttpOnly cookie) |

---

## Prerequisites

- Node.js 18+
- MySQL 8+

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/DmitriPer/EmployeeTimeClockApp.git
cd EmployeeTimeClockApp
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create `server/.env` based on the following:

```env
NODE_ENV=development
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_NAME=timeclock
DB_USER=your_db_user
DB_PASSWORD=your_db_password

JWT_SECRET=your_jwt_secret_at_least_32_characters_long
JWT_REFRESH_SECRET=your_refresh_secret_at_least_32_characters_long

CLIENT_ORIGIN=http://localhost:5173
```

### 4. Create the database

```sql
CREATE DATABASE timeclock CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 5. Run migrations

```bash
npm run migrate -w server
```

### 6. Seed the initial admin user

```bash
npm run seed -w server
```

This creates the first admin account (`ADMIN001` / `Admin1234!`). Additional users are created through the Admin → User Management panel in the app.

---

## Running the App

### Development (hot reload)

```bash
npm run dev
```

- Client: `http://localhost:5173`
- Server API: `http://localhost:3000`

### Production build

```bash
npm run build
node server/dist/index.js
```

---

## Running Tests

```bash
npm run test -w server
```

87 unit tests covering auth, timeclock, history, corrections, manager services, and middleware.

---

## Demo Accounts

| Role | Employee ID | Password |
|---|---|---|
| Admin | `ADMIN001` | `Admin1234!` |
| Manager | `MGR001` | `Meneger1234!` |
| Manager | `MGR002` | `Mgr1234!` |
| Employee | `EMP001` | `Employee1234!` |
| Employee | `EMP002` | `Emp2!134` |

> These accounts are created through the User Management panel after seeding the initial admin. Log in as `ADMIN001` to create them.

---

## Project Structure

```
├── client/          # Vue 3 frontend
│   └── src/
│       ├── api/     # Axios API calls
│       ├── components/
│       ├── stores/  # Pinia stores
│       ├── router/
│       └── views/
├── server/          # Express backend
│   └── src/
│       ├── auth/
│       ├── timeclock/
│       ├── history/
│       ├── corrections/
│       ├── manager/
│       ├── users/
│       ├── export/
│       └── db/      # Migrations, seed, Kysely connection
└── shared/          # Zod schemas shared between client and server
```
