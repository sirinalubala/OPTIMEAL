import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { requireOrganizationModule } from '../middleware/organizationAccess.js';
import { makePrediction, previewPredictions } from '../services/prediction.js';

const router = Router();
router.use(authenticate);
router.use(requireOrganizationModule('predictions'));

router.post('/', async (req, res, next) => {
  try {
    const prediction = await makePrediction({
      date: req.body?.date,
      mealType: req.body?.mealType,
      userId: req.user.id,
      organizationId: req.user.organizationId,
      organizationType: req.organizationType
    });
    res.status(201).json(prediction);
  } catch (error) {
    next(error);
  }
});

router.get('/preview', async (req, res, next) => {
  try {
    const preview = await previewPredictions({
      date: String(req.query.date || ''),
      organizationId: req.user.organizationId,
      organizationType: req.organizationType
    });
    res.json(preview);
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, target_date, meal_type, predicted_diners, recommended_quantity,
              estimated_surplus, model_name, insight, created_at
       FROM predictions WHERE organization_id = ? ORDER BY created_at DESC LIMIT 100`,
      [req.user.organizationId]
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

export default router;
