import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { requireOrganizationModule } from '../middleware/organizationAccess.js';
import { recordDefinitions } from '../models/records.js';

const router = Router();
const organizationModules = {
  students: 'students',
  customers: 'customers',
  employees: 'employees',
  clients: 'clients',
  residents: 'residents',
  hospital_contacts: 'hospital_contacts',
  events: 'events',
  registrations: 'registrations',
  menu: 'menu',
  attendance: 'attendance',
  inventory: 'inventory'
};
const mealTypes = ['breakfast', 'lunch', 'dinner', 'snacks'];
const personTypeByOrganization = {
  college_mess: { type: 'student', table: 'students' },
  hostel_mess: { type: 'resident', table: 'operational_records', recordType: 'resident' },
  corporate_cafeteria: { type: 'employee', table: 'operational_records', recordType: 'employee' }
};

router.use(authenticate);
router.use('/:resource', (req, res, next) => {
  const moduleName = organizationModules[req.params.resource];
  if (!moduleName) return next();
  return requireOrganizationModule(moduleName)(req, res, next);
});

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validateRecord(definition, body) {
  if (definition.required.some((field) => body[field] === undefined || body[field] === null || String(body[field]).trim() === '')) {
    return 'Complete all required fields.';
  }
  if (definition.validate && !definition.validate(body)) return 'One or more fields are invalid.';
  return null;
}

async function getRegistrations(req, res) {
  const conditions = ['organization_id = ?'];
  const values = [req.user.organizationId];
  if (req.query.date) {
    if (!validDate(req.query.date)) return res.status(400).json({ error: 'Invalid meal date.' });
    conditions.push('meal_date = ?');
    values.push(req.query.date);
  }
  if (req.query.mealType) {
    if (!mealTypes.includes(req.query.mealType)) return res.status(400).json({ error: 'Invalid meal type.' });
    conditions.push('meal_type = ?');
    values.push(req.query.mealType);
  }
  const [rows] = await pool.execute(
    `SELECT id, person_type, person_id, attendee_name, meal_date, meal_type, status, notes, created_at
     FROM meal_registrations WHERE ${conditions.join(' AND ')}
     ORDER BY meal_date DESC, meal_type ASC, attendee_name ASC LIMIT 500`,
    values
  );
  return res.json(rows);
}

async function createRegistration(req, res) {
  const body = req.body || {};
  const personConfig = personTypeByOrganization[req.organizationType];
  const personId = Number(body.personId);
  if (!personConfig || body.personType !== personConfig.type) {
    return res.status(403).json({ error: 'Meal registrations are not available for this record type.' });
  }
  if (!Number.isInteger(personId) || personId < 1 || !validDate(body.mealDate) || !mealTypes.includes(body.mealType)) {
    return res.status(400).json({ error: 'Choose a valid person, meal date, and meal type.' });
  }
  const personSql = personConfig.recordType
    ? 'SELECT id, name FROM operational_records WHERE organization_id = ? AND record_type = ? AND id = ?'
    : 'SELECT id, name FROM students WHERE organization_id = ? AND id = ?';
  const personValues = personConfig.recordType
    ? [req.user.organizationId, personConfig.recordType, personId]
    : [req.user.organizationId, personId];
  const [[person]] = await pool.execute(personSql, personValues);
  if (!person) return res.status(400).json({ error: 'The selected person does not exist in this organization.' });
  const [result] = await pool.execute(
    `INSERT INTO meal_registrations
       (organization_id, person_type, person_id, attendee_name, meal_date, meal_type, notes, recorded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.user.organizationId, personConfig.type, personId, person.name, body.mealDate, body.mealType, body.notes || null, req.user.id]
  );
  res.status(201).json({
    id: result.insertId, personType: personConfig.type, personId, attendeeName: person.name,
    mealDate: body.mealDate, mealType: body.mealType, status: 'registered', notes: body.notes || null
  });
}

router.get('/:resource', async (req, res, next) => {
  try {
    const { resource } = req.params;
    if (resource === 'registrations') return await getRegistrations(req, res);
    const definition = recordDefinitions[resource];
    if (!definition) return res.status(404).json({ error: 'Record type not found.' });
    const organizationId = req.user.organizationId;
    const search = String(req.query.search || '').trim();

    if (resource === 'customers') {
      const [managed] = await pool.execute(
        `SELECT id, name, reference, contact, notes, 'managed' AS source,
                0 AS bill_count, NULL AS last_purchase
         FROM operational_records
         WHERE organization_id = ? AND record_type = 'customer' AND (? = '' OR name LIKE ? OR contact LIKE ?)
         ORDER BY name ASC LIMIT 500`,
        [organizationId, search, `%${search}%`, `%${search}%`]
      );
      const [history] = await pool.execute(
        `SELECT b.customer_name AS name, COUNT(*) AS bill_count, MAX(b.created_at) AS last_purchase,
                'bill_history' AS source
         FROM bills b
         WHERE b.organization_id = ? AND (? = '' OR b.customer_name LIKE ?)
           AND NOT EXISTS (
             SELECT 1 FROM operational_records r
             WHERE r.organization_id = b.organization_id AND r.record_type = 'customer'
               AND r.name = b.customer_name
           )
         GROUP BY b.customer_name ORDER BY last_purchase DESC LIMIT 500`,
        [organizationId, search, `%${search}%`]
      );
      return res.json([...managed, ...history]);
    }

    const conditions = ['organization_id = ?'];
    const values = [organizationId];
    if (definition.recordType) {
      conditions.push('record_type = ?');
      values.push(definition.recordType);
    }
    if (resource === 'menu' && req.query.date) {
      if (!validDate(req.query.date)) return res.status(400).json({ error: 'Invalid menu date.' });
      conditions.push('menu_date = ?');
      values.push(req.query.date);
    }
    if (resource === 'attendance' && (req.query.mealType || req.query.meal_type)) {
      const mealType = req.query.mealType || req.query.meal_type;
      if (!mealTypes.includes(mealType)) return res.status(400).json({ error: 'Invalid meal type.' });
      conditions.push('meal_type = ?');
      values.push(mealType);
    }
    if (search) {
      conditions.push(`(${definition.search.map((column) => `${column} LIKE ?`).join(' OR ')})`);
      values.push(...definition.search.map(() => `%${search}%`));
    }
    const [rows] = await pool.execute(
      `SELECT * FROM ${definition.table} WHERE ${conditions.join(' AND ')} ORDER BY ${definition.orderBy} LIMIT 500`,
      values
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.post('/:resource', authorize('owner', 'manager', 'staff'), async (req, res, next) => {
  try {
    const { resource } = req.params;
    if (resource === 'registrations') return await createRegistration(req, res);
    const definition = recordDefinitions[resource];
    if (!definition) return res.status(404).json({ error: 'Record type not found.' });
    const body = req.body || {};
    const validationError = validateRecord(definition, body);
    if (validationError) return res.status(400).json({ error: validationError });

    const fields = [...definition.columns];
    const values = fields.map((field) => (
      body[field] === '' || body[field] === undefined
        ? definition.defaults?.[field] ?? null
        : body[field]
    ));
    if (definition.recordType) {
      fields.unshift('record_type');
      values.unshift(definition.recordType);
    }
    fields.push('organization_id');
    values.push(req.user.organizationId);
    if (resource === 'attendance') {
      fields.push('recorded_by');
      values.push(req.user.id);
    }
    const placeholders = fields.map(() => '?').join(', ');
    const [result] = await pool.execute(
      `INSERT INTO ${definition.table} (${fields.join(', ')}) VALUES (${placeholders})`,
      values
    );
    const [rows] = await pool.execute(
      `SELECT * FROM ${definition.table} WHERE organization_id = ? AND id = ?`,
      [req.user.organizationId, result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'A matching record already exists.' });
    next(error);
  }
});

router.put('/:resource/:id', authorize('owner', 'manager', 'staff'), async (req, res, next) => {
  try {
    const { resource } = req.params;
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid record ID.' });
    if (resource === 'registrations') {
      const { status, notes } = req.body || {};
      if (!['registered', 'served', 'absent'].includes(status)) {
        return res.status(400).json({ error: 'Choose a valid registration status.' });
      }
      const [[existing]] = await pool.execute(
        'SELECT id FROM meal_registrations WHERE organization_id = ? AND id = ?',
        [req.user.organizationId, id]
      );
      if (!existing) return res.status(404).json({ error: 'Meal registration not found.' });
      await pool.execute(
        `UPDATE meal_registrations SET status = ?, notes = ?
         WHERE organization_id = ? AND id = ?`,
        [status, notes || null, req.user.organizationId, id]
      );
      const [[updated]] = await pool.execute(
        `SELECT id, person_type, person_id, attendee_name, meal_date, meal_type, status, notes
         FROM meal_registrations WHERE organization_id = ? AND id = ?`,
        [req.user.organizationId, id]
      );
      return res.json(updated);
    }
    const definition = recordDefinitions[resource];
    if (!definition) return res.status(404).json({ error: 'Record type not found.' });
    const body = req.body || {};
    const validationError = validateRecord(definition, body);
    if (validationError) return res.status(400).json({ error: validationError });
    const fields = [...definition.columns];
    const values = fields.map((field) => (
      body[field] === '' || body[field] === undefined
        ? definition.defaults?.[field] ?? null
        : body[field]
    ));
    const conditions = ['organization_id = ?', 'id = ?'];
    values.push(req.user.organizationId, id);
    if (definition.recordType) {
      conditions.push('record_type = ?');
      values.push(definition.recordType);
    }
    const [[existing]] = await pool.execute(
      `SELECT id FROM ${definition.table} WHERE ${conditions.join(' AND ')}`,
      values.slice(fields.length)
    );
    if (!existing) return res.status(404).json({ error: 'Record not found.' });
    await pool.execute(
      `UPDATE ${definition.table} SET ${fields.map((field) => `${field} = ?`).join(', ')}
       WHERE ${conditions.join(' AND ')}`,
      values
    );
    const recordConditions = ['organization_id = ?', 'id = ?'];
    const recordValues = [req.user.organizationId, id];
    if (definition.recordType) {
      recordConditions.push('record_type = ?');
      recordValues.push(definition.recordType);
    }
    const [[updated]] = await pool.execute(
      `SELECT * FROM ${definition.table} WHERE ${recordConditions.join(' AND ')}`,
      recordValues
    );
    res.json(updated);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'A matching record already exists.' });
    next(error);
  }
});

router.delete('/:resource/:id', authorize('owner', 'manager'), async (req, res, next) => {
  try {
    const { resource } = req.params;
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid record ID.' });
    const definition = resource === 'registrations' ? null : recordDefinitions[resource];
    if (resource !== 'registrations' && !definition) return res.status(404).json({ error: 'Record type not found.' });
    const table = definition?.table || 'meal_registrations';
    const conditions = ['organization_id = ?', 'id = ?'];
    const values = [req.user.organizationId, id];
    if (definition?.recordType) {
      conditions.push('record_type = ?');
      values.push(definition.recordType);
    }
    const [result] = await pool.execute(
      `DELETE FROM ${table} WHERE ${conditions.join(' AND ')}`,
      values
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Record not found.' });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
