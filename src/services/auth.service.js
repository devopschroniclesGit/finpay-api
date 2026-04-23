const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const logger = require('../config/logger');

// ── Token generation ──────────────────────────────────────────────────────────

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// ── Register ──────────────────────────────────────────────────────────────────

const register = async ({ email, password, firstName, lastName }) => {
  // Normalise email — prevents duplicate accounts from case differences
  const normalisedEmail = email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({
    where: { email: normalisedEmail },
  });

  if (existing) {
    const err = new Error('An account with this email already exists');
    err.statusCode = 409;
    throw err;
  }

  // bcrypt cost factor 12 — high enough to be secure, low enough to be fast
  // Each increment doubles the work: 10 = fast, 12 = good default, 14 = slow
  const passwordHash = await bcrypt.hash(password, 12);

  // Create user and wallet account in a single transaction
  // If either fails, neither is created — no orphaned users without accounts
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email: normalisedEmail,
        passwordHash,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    });

    await tx.account.create({
      data: {
        userId: newUser.id,
        balance: 0.00,
        currency: 'ZAR',
      },
    });

    return newUser;
  });

  const token = generateToken(user.id);

  logger.info('New user registered', { userId: user.id, email: user.email });

  return { user, token };
};

// ── Login ─────────────────────────────────────────────────────────────────────

const login = async ({ email, password }) => {
  const normalisedEmail = email.toLowerCase().trim();

  // Fetch user including passwordHash (excluded from select by default elsewhere)
  const user = await prisma.user.findUnique({
    where: { email: normalisedEmail },
  });

  // Use a generic error message for both "user not found" and "wrong password"
  // Specific messages (e.g. "email not found") help attackers enumerate accounts
  const invalidCredentialsError = () => {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    return err;
  };

  if (!user) throw invalidCredentialsError();

  if (!user.isActive) {
    const err = new Error('Account has been deactivated. Please contact support.');
    err.statusCode = 403;
    throw err;
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) throw invalidCredentialsError();

  const token = generateToken(user.id);

  // Return user without passwordHash
  const { passwordHash, ...safeUser } = user;

  logger.info('User logged in', { userId: user.id });

  return { user: safeUser, token };
};

// ── Get profile ───────────────────────────────────────────────────────────────

const getProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  return user;
};

module.exports = { register, login, getProfile, generateToken };
