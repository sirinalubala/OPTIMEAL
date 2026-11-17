import jwt from 'jsonwebtoken';

export function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Please sign in to continue.' });
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    if (!Number.isInteger(user.organizationId) || user.organizationId < 1) {
      return res.status(401).json({ error: 'Your session is invalid. Please sign in again.' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    next();
  };
}
