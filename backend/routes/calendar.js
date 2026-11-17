import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { requireOrganizationModule } from '../middleware/organizationAccess.js';
import { getCalendarRange, indianStates, isValidCalendarDate } from '../services/calendar.js';

const router = Router();
const eventTypes = new Set(['holiday', 'festival', 'weekend', 'special_event', 'working_day']);
const mealTypes = new Set(['breakfast', 'lunch', 'dinner', 'snacks']);
router.use(authenticate);
router.use(requireOrganizationModule('calendar'));

function validateEvent(body) {
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const date = body?.date;
  const eventType = body?.eventType;
  const isOpen = body?.isOpen;
  const expectedCount = body?.expectedCount;
  const mealType = body?.mealType || null;
  if (!name || name.length > 120 || !isValidCalendarDate(date)) {
    return { error: 'Provide an event name of at most 120 characters and a valid date.' };
  }
  if (!eventTypes.has(eventType) || typeof isOpen !== 'boolean') {
    return { error: 'Choose a valid event type and whether the organization is open.' };
  }
  if (eventType === 'working_day' && !isOpen) {
    return { error: 'A working day must be marked open.' };
  }
  if (body.description != null && (typeof body.description !== 'string' || body.description.length > 1000)) {
    return { error: 'Event descriptions cannot exceed 1000 characters.' };
  }
  if (expectedCount !== null && expectedCount !== undefined
    && (!Number.isInteger(Number(expectedCount)) || Number(expectedCount) < 0 || Number(expectedCount) > 1000000)) {
    return { error: 'Expected attendance must be a whole number between 0 and 1,000,000.' };
  }
  if (mealType !== null && !mealTypes.has(mealType)) {
    return { error: 'Choose a valid meal service.' };
  }
  return {
    value: {
      date,
      name,
      description: body.description?.trim() || null,
      eventType,
      isOpen: Number(isOpen),
      expectedCount: expectedCount === null || expectedCount === undefined || expectedCount === ''
        ? null : Number(expectedCount),
      mealType
    }
  };
}

router.get('/states', (req, res) => {
  res.json(indianStates.map(([code, name]) => ({ code, name })));
});

router.get('/', async (req, res, next) => {
  try {
    const from = String(req.query.from || '');
    const to = String(req.query.to || '');
    res.json(await getCalendarRange({ organizationId: req.user.organizationId, from, to }));
  } catch (error) {
    next(error);
  }
});

router.put('/state', authorize('owner', 'manager'), async (req, res, next) => {
  try {
    const stateCode = req.body?.stateCode === '' ? null : req.body?.stateCode;
    if (stateCode !== null && !indianStates.some(([code]) => code === stateCode)) {
      return res.status(400).json({ error: 'Choose a supported Indian state or union territory.' });
    }
    await pool.execute(
      'UPDATE organizations SET indian_state = ? WHERE id = ?',
      [stateCode, req.user.organizationId]
    );
    res.json({ stateCode });
  } catch (error) {
    next(error);
  }
});

router.post('/events', authorize('owner', 'manager', 'staff'), async (req, res, next) => {
  try {
    const { error, value } = validateEvent(req.body);
    if (error) return res.status(400).json({ error });
    const [result] = await pool.execute(
      `INSERT INTO calendar_events
        (organization_id, event_date, name, description, event_type, is_open, expected_count, meal_type, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.organizationId, value.date, value.name, value.description, value.eventType,
        value.isOpen, value.expectedCount, value.mealType, req.user.id
      ]
    );
    res.status(201).json({ id: result.insertId, ...value, source: 'organization' });
  } catch (error) {
    next(error);
  }
});

router.put('/events/:id', authorize('owner', 'manager', 'staff'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Choose a valid event.' });
    const { error, value } = validateEvent(req.body);
    if (error) return res.status(400).json({ error });
    const [result] = await pool.execute(
      `UPDATE calendar_events SET event_date = ?, name = ?, description = ?, event_type = ?,
        is_open = ?, expected_count = ?, meal_type = ?
       WHERE id = ? AND organization_id = ?`,
      [
        value.date, value.name, value.description, value.eventType, value.isOpen,
        value.expectedCount, value.mealType, id, req.user.organizationId
      ]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Calendar event not found.' });
    res.json({ id, ...value, source: 'organization' });
  } catch (error) {
    next(error);
  }
});

router.delete('/events/:id', authorize('owner', 'manager'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Choose a valid event.' });
    const [result] = await pool.execute(
      'DELETE FROM calendar_events WHERE id = ? AND organization_id = ?',
      [id, req.user.organizationId]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Calendar event not found.' });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
