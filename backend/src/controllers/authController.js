import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq, sql } from 'drizzle-orm';
import env from '../config/env.js';
import { db } from '../config/db.js';
import { users } from '../models/index.js';
import { COOKIE_NAME } from '../middleware/authMiddleware.js';

function generateToken(userId) {
  return jwt.sign({ userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    // Check if email already registered
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${cleanEmail}`);

    if (existing) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'An account with this email address already exists.',
        },
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email: cleanEmail,
        passwordHash,
        role: 'user',
        isActive: true,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      });

    const token = generateToken(newUser.id);
    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      data: {
        user: newUser,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    const [user] = await db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${cleanEmail}`);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
        },
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_DISABLED',
          message: 'This account has been disabled. Please contact support.',
        },
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
        },
      });
    }

    const token = generateToken(user.id);
    setAuthCookie(res, token);

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };

    res.json({
      success: true,
      data: {
        user: safeUser,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  });
  res.json({
    success: true,
    message: 'Logged out successfully.',
  });
}

export async function me(req, res) {
  res.json({
    success: true,
    data: {
      user: req.user,
    },
  });
}
