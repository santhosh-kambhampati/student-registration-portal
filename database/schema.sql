-- ========================================================
-- Student Registration and Management Portal Database Schema
-- Database Name: student_portal
-- ========================================================

CREATE DATABASE IF NOT EXISTS student_portal
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE student_portal;

-- --------------------------------------------------------
-- Table structure for table `students`
-- --------------------------------------------------------
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

-- --------------------------------------------------------
-- Initial Administrator Account Provisioning Notice:
-- In production, the administrator account is automatically
-- seeded and verified by backend/server.js using ADMIN_EMAIL
-- and ADMIN_PASSWORD environment variables with bcrypt hashing.
--
-- For manual development database setup, you can optionally run:
-- --------------------------------------------------------
INSERT INTO students (
  user_id,
  name,
  email,
  password_hash,
  date_of_birth,
  gender,
  qualification,
  interests,
  class,
  subject,
  marks,
  aadhaar_file,
  role
) VALUES (
  'ADM001',
  'Portal Administrator',
  'admin@portal.com',
  -- Default development bcrypt hash for password 'Admin@12345'
  '$2b$10$u0PjXGu28mnfiTM7M77RyO6jBVaTWlJGawM4SVlrfskhKaSEI5nNq',
  '1990-01-01',
  'Other',
  'Master\'s',
  'Coding, Management',
  'Staff',
  'Administration',
  100.00,
  NULL,
  'admin'
) ON DUPLICATE KEY UPDATE
  role = 'admin',
  updated_at = CURRENT_TIMESTAMP;
