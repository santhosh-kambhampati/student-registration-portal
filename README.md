# Student Registration Portal

A complete, production-ready full-stack Student Registration and Management Portal built with Vanilla Web technologies, Express.js, and MySQL.

---

## Features

- **Student Registration**: Multi-field onboarding capturing academic history, auto-generating readable unique IDs (`STU001`, `STU002`), and enforcing strict PDF-only document validation.
- **Unified Login**: A single authentication gateway for both students and administrators with dynamic role-based redirection.
- **Student Dashboard**: Displays academic credentials, dynamic welcome banner, locked core identity fields (`Name`, `Email`, `User ID`), and secure Aadhaar PDF viewing/replacement.
- **Admin Dashboard**: Real-time management console featuring:
  - Responsive student records data table.
  - Complete CRUD operations (Create via signup, Read all, Update details, Delete with confirmation modal).
  - Multi-condition instant search & filtering (Search by Name, Filter by Class, Minimum Age, Maximum Age).
  - Dynamic age calculation computed directly from `date_of_birth` using SQL `TIMESTAMPDIFF`.
  - Security audit lock: `Name`, `Email`, and `User ID` remain strictly unchangeable on both frontend and backend.
- **Aadhaar PDF Upload & Security**:
  - Validates file extension (`.pdf`), MIME type (`application/pdf`), and inspects PDF binary magic bytes (`%PDF-`).
  - Limits file size to 5 MB.
  - Automatically renames files using collision-resistant timestamps and UUIDs.
  - Storage directory is never exposed publicly; files are streamed exclusively via authenticated, role-authorized backend endpoints.
- **Protected Aadhaar Access**: Granular access control ensuring students only access their own document and administrators can review student files.
- **Password Reset Flow**: End-to-end tokenized forgot-and-reset password mechanism with time-limited cryptographic tokens.
- **Role-Based Authorization**: Express middleware (`isAuthenticated`, `isAdmin`) enforcing RBAC at the API layer. Unauthorized requests receive HTTP 401 or 403.
- **Health Check**: Cloud-ready monitoring endpoint at `GET /api/health`.

---

## Tech Stack

### Frontend
- HTML5
- Vanilla CSS & Modern Design Tokens
- Bootstrap 5.3.3 & Bootstrap Icons 1.11.3
- Vanilla JavaScript (ES6+)

### Backend
- Node.js (v18+)
- Express.js 4.x
- Multer (Multipart file uploads)
- bcryptjs (Password hashing with salt rounds: 10)
- express-session (Session state with httpOnly cookies)
- cors (CORS handling with origin filtering)
- dotenv (Environment variable management)

### Database
- MySQL 8.x / 9.x
- mysql2/promise (Connection pooling, parameterized queries)

### Authentication
- Session-based authentication stored with `express-session`, secured with `httpOnly: true` cookies, `sameSite` policy, and trust proxy enablement for production reverse proxies.

---

## Local Setup

Follow these exact steps to run the application locally:

### 1. Clone Repository
```bash
git clone <repository-url>
cd student-registration-portal
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Create MySQL Database & Run Schema
Ensure your MySQL server is running locally, then initialize the database schema:
```bash
mysql -u root -p < database/schema.sql
```
*(Enter your MySQL root password when prompted)*

This creates the `student_portal` database, the `students` table, performance indexes, and initial configuration.

### 4. Create and Configure `.env`
Copy `.env.example` to create your local `.env`:
```bash
cp .env.example .env
```
Update `.env` with your local database credentials:
```env
PORT=5001
NODE_ENV=development
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=student_portal
DB_SSL=false
SESSION_SECRET=your_local_secret_key
ADMIN_EMAIL=admin@portal.com
ADMIN_PASSWORD=Admin@12345
FRONTEND_URL=
```

### 5. Start Backend & Open Frontend
Start the application server:
```bash
npm start
```
By default, the Express server serves both the API and the frontend pages:
- **Landing Page**: [http://localhost:5001/](http://localhost:5001/)
- **Student Registration**: [http://localhost:5001/signup.html](http://localhost:5001/signup.html)
- **Unified Login**: [http://localhost:5001/login.html](http://localhost:5001/login.html)
- **Student Dashboard**: [http://localhost:5001/student-dashboard.html](http://localhost:5001/student-dashboard.html)
- **Admin Dashboard**: [http://localhost:5001/admin-dashboard.html](http://localhost:5001/admin-dashboard.html)
- **Health Check**: [http://localhost:5001/api/health](http://localhost:5001/api/health)

### 6. Run Automated Verification Tests
Run the comprehensive 21-point automated test suite:
```bash
npm test
```

---

## Environment Variables

All configuration is handled via environment variables:

| Variable | Description | Default / Example |
|---|---|---|
| `PORT` | Port number the backend server listens on | `5001` (or `5000` / cloud assigned) |
| `NODE_ENV` | Application environment (`development` or `production`) | `development` |
| `DB_HOST` | MySQL database host | `localhost` or cloud host |
| `DB_PORT` | MySQL database port | `3306` |
| `DB_USER` | MySQL database user | `root` or cloud user |
| `DB_PASSWORD` | MySQL database password | Database password |
| `DB_NAME` | MySQL database name | `student_portal` |
| `DB_SSL` | Enable TLS/SSL for cloud database connections | `false` (set `true` for AWS RDS / Aiven / PlanetScale) |
| `SESSION_SECRET` | Cryptographic secret for signing session cookies | Secure random string |
| `ADMIN_EMAIL` | Default administrator account email | `admin@portal.com` |
| `ADMIN_PASSWORD` | Default administrator account password | Initial secure password |
| `FRONTEND_URL` | Allowed frontend origin(s) for CORS (comma-separated) | `http://localhost:3000` or production domain |

---

## Deployment Guide

### 1. Database Configuration (Cloud MySQL)
- Provision a MySQL instance on any cloud provider (e.g., AWS RDS, DigitalOcean Managed Databases, PlanetScale, Aiven, or Railway MySQL).
- Execute `database/schema.sql` against the cloud database.
- If your provider requires SSL connections, set `DB_SSL=true` in your server environment variables.
- Configure `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` accordingly.

### 2. Backend Deployment (Node.js / Express)
- Supported platforms: Render, Railway, Heroku, AWS Elastic Beanstalk, DigitalOcean App Platform, or Docker.
- Build command: `npm install`
- Start command: `npm start`
- Set `NODE_ENV=production`.
- The server automatically enables `trust proxy` in production for reverse proxies (e.g. Nginx, Cloudflare, AWS ALB) and enforces secure cookies.
- Uploads are saved in `backend/uploads/aadhaar/`. For multi-instance horizontal scaling, attach a persistent storage volume or mount.

### 3. Frontend Deployment Options
- **Unified Deployment (Recommended)**: The Express backend serves the static frontend directly from `frontend/`. No separate frontend hosting or CORS configuration is required.
- **Separated Deployment**: If hosting the static frontend on Vercel, Netlify, Cloudflare Pages, or AWS S3:
  1. Set `FRONTEND_URL` in the backend environment variables to your frontend domain (e.g. `https://portal.yourdomain.com`).
  2. Configure `window.__API_BASE_URL__ = "https://api.yourdomain.com"` in `frontend/js/config.js` or via an inline `<script>` tag before loading other scripts.

### 4. Production URL Configuration
- When deploying the backend, set `PORT` (or let the host provide `process.env.PORT`).
- Update `SESSION_SECRET` to a cryptographically secure random string (e.g. generated via `openssl rand -hex 32`).
- Monitor service health using `GET /api/health`.

---

## Security Practices Summary

- **Passwords**: Never stored in plaintext. Hashed with `bcryptjs` (salt rounds: 10).
- **SQL Injections**: All queries use parameterized statements (`?` placeholders) with `mysql2`.
- **Cross-Site Scripting (XSS)**: Session cookies use `httpOnly: true` to prevent client-side script access.
- **Aadhaar Protection**: File upload checks MIME type, extension, and file header magic bytes (`%PDF-`). File access requires authenticated session authorization.
- **Immutability Enforcement**: Core student identity fields (`Name`, `Email`, `User ID`) are blocked from modification on both frontend and backend.
- **Clean Git**: Secrets, `.env` files, uploads, and dependencies are strictly excluded from version control via `.gitignore`.
