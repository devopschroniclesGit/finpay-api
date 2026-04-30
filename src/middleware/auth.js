const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const redis = require('../config/redis');
const { error } = require('../utils/response');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(res, 'No token provided. Use Authorization: Bearer <token>', 401);
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return error(res, 'Malformed authorization header', 401);
  }

  try {
    const blacklisted = await redis.get(`blacklist:${token}`);
    if (blacklisted) {
	    return error(res, 'Session has been revoked. Please login again.', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });

    if (!user) {
      return error(res, 'User no longer exists', 401);
    }

    if (!user.isActive) {
      return error(res, 'Account has been deactivated', 403);
    }

    // Attach user to request — available in all downstream handlers
    req.user = user;
    next();
  } catch (err) {
    next(err); // forwarded to errorHandler which handles JWT errors
  }
};

module.exports = { authenticate };
