import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getProfile, login, signup, updateProfile } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: true, legacyHeaders: false });

router.post('/login', authLimiter, login);
router.post('/signup', authLimiter, signup);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);

export default router;
