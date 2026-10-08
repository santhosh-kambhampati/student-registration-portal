const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { pool, testConnection } = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const studentRoutes = require('./routes/student.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable reverse proxy trust in production (Heroku, Render, AWS, Railway)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration (supports configured FRONTEND_URL and local development)
const frontendUrls = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((u) => u.trim().replace(/\/+$/, ''))
  : [];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (e.g. same-origin, curl, server-to-server)
      if (!origin) return callback(null, true);

      // Check against configured frontend URLs
      if (frontendUrls.includes(origin)) return callback(null, true);

      // In non-production environments, allow localhost / 127.0.0.1
      if (process.env.NODE_ENV !== 'production') {
        if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return callback(null, true);
        }
      }

      // Default allow if no specific FRONTEND_URL was constrained
      if (frontendUrls.length === 0) {
        return callback(null, true);
      }

      return callback(new Error('Blocked by CORS policy'));
    },
    credentials: true
  })
);

// Express Session configuration with MySQL session store
const sessionSecret = process.env.SESSION_SECRET || 'student_portal_default_secret_key_2026';
if (process.env.NODE_ENV === 'production' && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'student_portal_default_secret_key_2026')) {
  console.warn('[SECURITY WARNING] Running in production with default SESSION_SECRET. Set a unique SESSION_SECRET in environment variables.');
}

const sessionStore = new MySQLStore({
  clearExpired: true,
  checkExpirationInterval: 900000, // 15 mins
  expiration: 86400000, // 24 hours
  createDatabaseTable: true
}, pool);

const isCrossDomainProd = process.env.NODE_ENV === 'production' && frontendUrls.length > 0;
app.use(
  session({
    store: sessionStore,
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: isCrossDomainProd ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  })
);

// Health check endpoint (for cloud health monitoring)
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Serve Frontend Static files
const frontendPath = path.resolve(__dirname, '../frontend');
app.use(express.static(frontendPath));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/admin', adminRoutes);

// Root redirect to login or index
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// 404 handler for API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found.'
  });
});

// Central error handler (Sanitizes stack traces and internals in production)
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err.message || err);
  const statusCode = err.status || 500;
  const isProd = process.env.NODE_ENV === 'production';
  res.status(statusCode).json({
    success: false,
    message: isProd && statusCode === 500 ? 'Internal server error occurred.' : (err.message || 'Internal server error occurred.')
  });
});

/**
 * Ensure database schema (students table) is created if not exists
 */
async function ensureSchema() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        date_of_birth DATE NOT NULL,
        gender ENUM('Male', 'Female', 'Other') NOT NULL,
        qualification VARCHAR(100) NOT NULL,
        interests VARCHAR(255) NOT NULL,
        class VARCHAR(50) NOT NULL,
        subject VARCHAR(100) NOT NULL,
        marks DECIMAL(5,2) NOT NULL,
        aadhaar_file VARCHAR(255) NULL,
        role ENUM('student', 'admin') NOT NULL DEFAULT 'student',
        reset_token VARCHAR(255) NULL,
        reset_token_expiry DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_user_id (user_id),
        INDEX idx_name (name),
        INDEX idx_class (class),
        INDEX idx_dob (date_of_birth),
        INDEX idx_role (role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('[DB] Schema verified/initialized.');
  } catch (error) {
    console.error('[DB] Schema initialization error:', error.message);
  }
}

/**
 * Ensure default development admin account is present in database
 */
async function ensureAdminAccount() {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@portal.com').trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';

    const [existing] = await pool.query('SELECT id, email, role FROM students WHERE email = ?', [adminEmail]);

    if (existing.length === 0) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await pool.query(
        `INSERT INTO students (
          user_id, name, email, password_hash, date_of_birth,
          gender, qualification, interests, class, subject, marks, role
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'ADM001',
          'Portal Administrator',
          adminEmail,
          passwordHash,
          '1990-01-01',
          'Other',
          "Master's",
          'Coding, Management',
          'Staff',
          'Administration',
          100.0,
          'admin'
        ]
      );
      console.log(`[INIT] Default admin created: ${adminEmail}`);
    } else {
      // Ensure role is admin
      if (existing[0].role !== 'admin') {
        await pool.query("UPDATE students SET role = 'admin' WHERE id = ?", [existing[0].id]);
      }
    }
  } catch (error) {
    console.error('[INIT] Failed to verify/seed admin account:', error.message);
  }
}

let initPromise = null;
async function ensureInit() {
  if (!initPromise) {
    initPromise = (async () => {
      await ensureSchema();
      await ensureAdminAccount();
    })();
  }
  return initPromise;
}

// Ensure database schema and admin account in serverless environments
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api') && req.path !== '/api/health') {
    try {
      await ensureInit();
    } catch (err) {
      console.error('[INIT] Error ensuring database initialization:', err.message);
    }
  }
  next();
});

// Start standalone HTTP Server only when run directly (local development and tests)
if (require.main === module) {
  testConnection()
    .then(async () => {
      console.log('[DB] Connected to MySQL database successfully.');
      await ensureInit();

      app.listen(PORT, '0.0.0.0', () => {
        console.log(`=======================================================`);
        console.log(` Student Portal Server running on http://0.0.0.0:${PORT}`);
        console.log(` Frontend accessible at http://0.0.0.0:${PORT}`);
        console.log(`=======================================================`);
      });
    })
    .catch((err) => {
      console.error('[DB] Database connection error. Failed to start server:', err);
      process.exit(1);
    });
}

module.exports = app;
