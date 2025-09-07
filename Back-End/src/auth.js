import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sql, pool } from './db.js';

const authRouter = Router();

// --- User Registration ---
authRouter.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const password_hash = await bcrypt.hash(password, 10);

    const request = pool.request();
    request.input('username', sql.NVarChar, username);
    request.input('password_hash', sql.NVarChar, password_hash);

    const result = await request.query(
      'INSERT INTO dbo.Users (username, password_hash) OUTPUT INSERTED.id, INSERTED.username VALUES (@username, @password_hash)'
    );

    res.status(201).json(result.recordset[0]);
  } catch (error) {
    if (error.number === 2627 || error.number === 2601) {
      return res.status(409).json({ error: 'Username already exists.' });
    }
    console.error('Registration Error:', error);
    // DB 오류 상세 메시지도 함께 전달
    res.status(500).json({ error: 'Database error during registration.', details: error.message || error.toString() });
  }
});

// --- User Login ---
authRouter.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const request = pool.request();
    request.input('username', sql.NVarChar, username);
  const result = await request.query('SELECT * FROM dbo.Users WHERE username = @username');
    const user = result.recordset[0];


    if (!user) {
      // 계정이 없을 때 404로 응답
      return res.status(404).json({ error: 'User not found. Please register.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const payload = {
      sub: user.id,
      username: user.username,
    };

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'Server misconfiguration: JWT_SECRET not set' });
    }
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token });
  } catch (error) {
    console.error('Login Error:', error);
  res.status(500).json({ error: 'Database or auth error during login.' });
  }
});

export { authRouter };
