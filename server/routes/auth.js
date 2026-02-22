import express from 'express';
import bcrypt from 'bcrypt';
import { userDb } from '../database/db.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Check auth status and setup requirements
router.get('/status', async (req, res) => {
  try {
    const hasUsers = await userDb.hasUsers();
    res.json({ 
      needsSetup: !hasUsers,
      isAuthenticated: false // Will be overridden by frontend if token exists
    });
  } catch (error) {
    console.error('Auth status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User registration (setup) - only allowed if no users exist
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('📝 Registration attempt for user:', username);
    
    // Validate input
    if (!username || !password) {
      console.log('❌ Registration failed: Missing username or password');
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    if (username.length < 3 || password.length < 6) {
      console.log('❌ Registration failed: Invalid length');
      return res.status(400).json({ error: 'Username must be at least 3 characters, password at least 6 characters' });
    }
    
    // Check if users already exist (only allow one user)
    const hasUsers = await userDb.hasUsers();
    console.log('Check hasUsers:', hasUsers);
    if (hasUsers) {
      console.log('❌ Registration failed: User already exists');
      return res.status(403).json({ error: 'User already exists. This is a single-user system.' });
    }
    
    // Hash password
    const saltRounds = 12;
    console.log('Hashing password...');
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Create user
    console.log('Creating user in DB...');
    const user = await userDb.createUser(username, passwordHash);
    
    // Generate token
    const token = generateToken(user);
    
    // Update last login
    await userDb.updateLastLogin(user.id);
    
    console.log('✅ Registration successful for:', username);
    res.json({
      success: true,
      user: { id: user.id, username: user.username },
      token
    });
    
  } catch (error) {
    console.error('❌ Registration error:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(409).json({ error: 'Username already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// User login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('🔑 Login attempt for user:', username);
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Get user from database
    const user = await userDb.getUserByUsername(username);
    if (!user) {
      console.log('❌ Login failed: User not found');
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      console.log('❌ Login failed: Invalid password');
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Generate token
    const token = generateToken(user);
    
    // Update last login
    await userDb.updateLastLogin(user.id);
    
    console.log('✅ Login successful for:', username);
    res.json({
      success: true,
      user: { id: user.id, username: user.username },
      token
    });
    
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user (protected route)
router.get('/user', authenticateToken, (req, res) => {
  res.json({
    user: req.user
  });
});

// Logout (client-side token removal, but this endpoint can be used for logging)
router.post('/logout', authenticateToken, (req, res) => {
  // In a simple JWT system, logout is mainly client-side
  // This endpoint exists for consistency and potential future logging
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;