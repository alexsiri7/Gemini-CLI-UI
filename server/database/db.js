import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = path.join(__dirname, 'geminicliui_auth.db');
const INIT_SQL_PATH = path.join(__dirname, 'init.sql');

// Create database connection
const db = new Database(DB_PATH);
// console.log('Connected to SQLite database');

// Initialize database with schema
const initializeDatabase = async () => {
  try {
    const initSQL = fs.readFileSync(INIT_SQL_PATH, 'utf8');
    db.exec(initSQL);
    // console.log('Database initialized successfully');
  } catch (error) {
    // console.error('Error initializing database:', error.message);
    throw error;
  }
};

// User database operations
const userDb = {
  // Check if any users exist
  hasUsers: () => {
    try {
      console.log('Database: Checking if users exist...');
      const row = db.prepare('SELECT COUNT(*) as count FROM geminicliui_users').get();
      console.log('Database: hasUsers count:', row.count);
      return row.count > 0;
    } catch (err) {
      console.error('Database Error (hasUsers):', err);
      throw err;
    }
  },

  // Create a new user
  createUser: (username, passwordHash) => {
    try {
      console.log('Database: Creating user:', username);
      const stmt = db.prepare('INSERT INTO geminicliui_users (username, password_hash) VALUES (?, ?)');
      const result = stmt.run(username, passwordHash);
      console.log('Database: User created, ID:', result.lastInsertRowid);
      return { id: result.lastInsertRowid, username };
    } catch (err) {
      console.error('Database Error (createUser):', err);
      throw err;
    }
  },

  // Get user by username
  getUserByUsername: (username) => {
    try {
      console.log('Database: Fetching user by username:', username);
      const row = db.prepare('SELECT * FROM geminicliui_users WHERE username = ? AND is_active = 1').get(username);
      console.log('Database: User found:', !!row);
      return row;
    } catch (err) {
      console.error('Database Error (getUserByUsername):', err);
      throw err;
    }
  },

  // Update last login time
  updateLastLogin: (userId) => {
    try {
      console.log('Database: Updating last login for ID:', userId);
      db.prepare('UPDATE geminicliui_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(userId);
    } catch (err) {
      console.error('Database Error (updateLastLogin):', err);
      throw err;
    }
  },

  // Get user by ID
  getUserById: (userId) => {
    try {
      console.log('Database: Fetching user by ID:', userId);
      const row = db.prepare('SELECT id, username, created_at, last_login FROM geminicliui_users WHERE id = ? AND is_active = 1').get(userId);
      return row;
    } catch (err) {
      console.error('Database Error (getUserById):', err);
      throw err;
    }
  }
};

export {
  db,
  initializeDatabase,
  userDb
};