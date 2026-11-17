import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { normalizeOrganizationType, organizationTypes } from '../config/organizationTypes.js';

function issueToken(user) {
  const token = jwt.sign(
    {
      id: user.id,
      organizationId: user.organization_id,
      name: user.name,
      email: user.email,
      userId: user.user_id,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
  return {
    token,
    user: {
      id: user.id,
      organizationId: user.organization_id,
      name: user.name,
      email: user.email,
      userId: user.user_id,
      organizationName: user.organization_name,
      organizationType: normalizeOrganizationType(user.organization_type),
      role: user.role
    }
  };
}

export async function login(req, res, next) {
  try {
    const body = req.body || {};
    const identifier = String(body.identifier || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!identifier || !password) return res.status(400).json({ error: 'Email or User ID and password are required.' });

    const [users] = await pool.execute(
      `SELECT u.id, u.organization_id, u.name, u.user_id, u.email, u.password_hash, u.role,
              o.name AS organization_name, o.organization_type
       FROM users u JOIN organizations o ON o.id = u.organization_id
       WHERE u.email = ? OR u.user_id = ? LIMIT 1`,
      [identifier, identifier]
    );
    if (!users.length || !(await bcrypt.compare(password, users[0].password_hash))) {
      return res.status(401).json({ error: 'Email/User ID or password is incorrect.' });
    }

    res.json(issueToken(users[0]));
  } catch (error) {
    next(error);
  }
}

export async function getProfile(req, res, next) {
  try {
    const [[user]] = await pool.execute(
      `SELECT u.id, u.name, u.email, u.user_id, u.role,
              o.name AS organization_name, o.organization_type
       FROM users u JOIN organizations o ON o.id = u.organization_id
       WHERE u.id = ? AND u.organization_id = ?`,
      [req.user.id, req.user.organizationId]
    );
    if (!user) return res.status(404).json({ error: 'Profile not found.' });
    res.json({
      id: user.id,
      organizationId: req.user.organizationId,
      name: user.name,
      email: user.email,
      userId: user.user_id,
      organizationName: user.organization_name,
      organizationType: normalizeOrganizationType(user.organization_type),
      role: user.role
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req, res, next) {
  const body = req.body || {};
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const userId = String(body.userId || '').trim().toLowerCase();
  const organizationName = String(body.organizationName || '').trim();

  if (!name || !email || !userId || !organizationName) {
    return res.status(400).json({ error: 'Name, email, User ID, and organization name are required.' });
  }
  if (name.length > 120 || organizationName.length > 140) {
    return res.status(400).json({ error: 'Name or organization name is too long.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 190) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (!/^[a-z0-9._-]{3,40}$/.test(userId)) {
    return res.status(400).json({ error: 'User ID must be 3–40 characters using letters, numbers, dots, underscores or hyphens.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    await connection.execute(
      'UPDATE users SET name = ?, email = ?, user_id = ? WHERE id = ? AND organization_id = ?',
      [name, email, userId, req.user.id, req.user.organizationId]
    );
    await connection.execute(
      'UPDATE organizations SET name = ? WHERE id = ?',
      [organizationName, req.user.organizationId]
    );
    const [[user]] = await connection.execute(
      `SELECT u.id, u.name, u.email, u.user_id, u.role,
              o.name AS organization_name, o.organization_type
       FROM users u JOIN organizations o ON o.id = u.organization_id
       WHERE u.id = ? AND u.organization_id = ?`,
      [req.user.id, req.user.organizationId]
    );
    await connection.commit();
    res.json({
      id: user.id,
      organizationId: req.user.organizationId,
      name: user.name,
      email: user.email,
      userId: user.user_id,
      organizationName: user.organization_name,
      organizationType: normalizeOrganizationType(user.organization_type),
      role: user.role
    });
  } catch (error) {
    if (connection) await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'That email address or User ID is already registered.' });
    }
    next(error);
  } finally {
    if (connection) connection.release();
  }
}

export async function signup(req, res, next) {
  const body = req.body || {};
  const name = String(body.name || '').trim();
  const organizationName = String(body.organizationName || '').trim();
  const organizationType = String(body.organizationType || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const userId = String(body.userId || '').trim().toLowerCase();
  const password = String(body.password || '');
  const confirmPassword = String(body.confirmPassword || '');

  if (!name || !organizationName || !organizationType || !email || !userId || !password || !confirmPassword) {
    return res.status(400).json({ error: 'Complete every field to create your account.' });
  }
  if (name.length > 120 || organizationName.length > 140) {
    return res.status(400).json({ error: 'Name or organization name is too long.' });
  }
  if (!Object.hasOwn(organizationTypes, organizationType)) {
    return res.status(400).json({ error: 'Choose a valid organization type.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 190) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (!/^[a-z0-9._-]{3,40}$/.test(userId)) {
    return res.status(400).json({ error: 'User ID must be 3–40 characters using letters, numbers, dots, underscores or hyphens.' });
  }
  if (password.length < 12 || password.length > 72) {
    return res.status(400).json({ error: 'Password must be between 12 and 72 characters.' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  let connection;
  try {
    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE email = ? OR user_id = ? LIMIT 1',
      [email, userId]
    );
    if (existing.length) {
      return res.status(409).json({ error: 'That email address or User ID is already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [organizationResult] = await connection.execute(
      'INSERT INTO organizations (name, organization_type) VALUES (?, ?)',
      [organizationName, organizationType]
    );
    await connection.execute(
      `INSERT INTO users (organization_id, name, user_id, email, password_hash, role)
       VALUES (?, ?, ?, ?, ?, 'owner')`,
      [organizationResult.insertId, name, userId, email, passwordHash]
    );
    await connection.commit();
    res.status(201).json({ message: 'Your organization is ready. Sign in with your new credentials.' });
  } catch (error) {
    if (connection) await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'That email address or User ID is already registered.' });
    }
    next(error);
  } finally {
    if (connection) connection.release();
  }
}
