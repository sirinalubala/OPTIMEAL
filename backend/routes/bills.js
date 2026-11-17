import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import pool from '../config/db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { requireOrganizationModule } from '../middleware/organizationAccess.js';
import { hasOrganizationModule } from '../config/organizationTypes.js';

const router = Router();
router.use(authenticate);
router.use(requireOrganizationModule('billing'));
router.use('/orders', requireOrganizationModule('orders'));

router.get('/', async (req, res, next) => {
  try {
    const [bills] = await pool.execute(
      `SELECT b.id, b.bill_number, b.customer_name, b.subtotal, b.total, b.created_at,
              b.order_status, e.name AS event_name,
              IF(?, s.student_code, NULL) AS student_code
       FROM bills b
       LEFT JOIN students s ON s.id = b.student_id AND s.organization_id = b.organization_id
       LEFT JOIN operational_records e ON e.id = b.event_record_id
         AND e.organization_id = b.organization_id AND e.record_type = 'event'
       WHERE b.organization_id = ?
       ORDER BY b.created_at DESC LIMIT 200`,
      [hasOrganizationModule(req.organizationType, 'students'), req.user.organizationId]
    );
    res.json(bills);
  } catch (error) {
    next(error);
  }
});

router.get('/orders', async (req, res, next) => {
  try {
    const [orders] = await pool.execute(
      `SELECT id, bill_number, customer_name, total, order_status, created_at
       FROM bills WHERE organization_id = ? ORDER BY created_at DESC LIMIT 500`,
      [req.user.organizationId]
    );
    res.json(orders);
  } catch (error) {
    next(error);
  }
});

router.put('/orders/:id/status', authorize('owner', 'manager', 'staff'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body || {};
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid order ID.' });
    if (!['pending', 'preparing', 'ready', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Choose a valid order status.' });
    }
    const [[existing]] = await pool.execute(
      'SELECT id FROM bills WHERE organization_id = ? AND id = ?',
      [req.user.organizationId, id]
    );
    if (!existing) return res.status(404).json({ error: 'Order not found.' });
    await pool.execute(
      'UPDATE bills SET order_status = ? WHERE organization_id = ? AND id = ?',
      [status, req.user.organizationId, id]
    );
    res.json({ id, status });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid bill ID.' });
    const [[bill]] = await pool.execute(
      `SELECT b.*, IF(?, s.student_code, NULL) AS student_code, e.name AS event_name FROM bills b
       LEFT JOIN students s ON s.id = b.student_id AND s.organization_id = b.organization_id
       LEFT JOIN operational_records e ON e.id = b.event_record_id
         AND e.organization_id = b.organization_id AND e.record_type = 'event'
       WHERE b.organization_id = ? AND b.id = ?`,
      [hasOrganizationModule(req.organizationType, 'students'), req.user.organizationId, id]
    );
    if (!bill) return res.status(404).json({ error: 'Bill not found.' });
    const [items] = await pool.execute(
      'SELECT item_name, quantity, unit_price, line_total FROM bill_items WHERE organization_id = ? AND bill_id = ? ORDER BY id',
      [req.user.organizationId, id]
    );
    res.json({ ...bill, items });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const body = req.body || {};
    const organizationId = req.user.organizationId;
    const customerName = String(body.customerName || '').trim();
    const studentId = body.studentId ? Number(body.studentId) : null;
    const eventId = body.eventId ? Number(body.eventId) : null;
    const items = body.items;
    if (!customerName) return res.status(400).json({ error: 'Customer name is required.' });
    if (!Array.isArray(items) || !items.length || items.length > 30) {
      return res.status(400).json({ error: 'Add between 1 and 30 menu items to the bill.' });
    }
    if (studentId && (!Number.isInteger(studentId) || studentId < 1)) {
      return res.status(400).json({ error: 'Choose a valid student.' });
    }
    if (studentId && !hasOrganizationModule(req.organizationType, 'students')) {
      return res.status(403).json({ error: 'Student billing is not available for this organization.' });
    }
    if (req.organizationType === 'catering_service' && !eventId) {
      return res.status(400).json({ error: 'Choose the catering event for this invoice.' });
    }
    if (eventId && req.organizationType !== 'catering_service') {
      return res.status(403).json({ error: 'Event billing is not available for this organization.' });
    }

    await connection.beginTransaction();
    if (studentId) {
      const [[student]] = await connection.execute(
        'SELECT id FROM students WHERE organization_id = ? AND id = ?',
        [organizationId, studentId]
      );
      if (!student) {
        await connection.rollback();
        return res.status(400).json({ error: 'Selected student does not exist in this organization.' });
      }
    }
    if (eventId) {
      if (!Number.isInteger(eventId) || eventId < 1) {
        await connection.rollback();
        return res.status(400).json({ error: 'Choose a valid event.' });
      }
      const [[event]] = await connection.execute(
        `SELECT id, name FROM operational_records
         WHERE organization_id = ? AND record_type = 'event' AND id = ?`,
        [organizationId, eventId]
      );
      if (!event) {
        await connection.rollback();
        return res.status(400).json({ error: 'Selected event does not exist in this organization.' });
      }
    }
    const billItems = [];
    for (const item of items) {
      const menuItemId = Number(item.menuItemId);
      const quantity = Number(item.quantity);
      if (!Number.isInteger(menuItemId) || menuItemId < 1 || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
        await connection.rollback();
        return res.status(400).json({ error: 'Each item must have a valid menu selection and quantity.' });
      }
      const [[menuItem]] = await connection.execute(
        'SELECT id, item_name, price FROM menu_items WHERE organization_id = ? AND id = ?',
        [organizationId, menuItemId]
      );
      if (!menuItem) {
        await connection.rollback();
        return res.status(400).json({ error: 'A selected menu item no longer exists.' });
      }
      billItems.push({
        menuItemId,
        itemName: menuItem.item_name,
        quantity,
        unitPrice: Number(menuItem.price),
        lineTotal: Math.round(Number(menuItem.price) * quantity * 100) / 100
      });
    }
    const subtotal = Math.round(billItems.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100;
    const billNumber = `OM-${Date.now()}-${randomBytes(2).toString('hex').toUpperCase()}`;
    const [billResult] = await connection.execute(
      `INSERT INTO bills
        (organization_id, bill_number, student_id, event_record_id, customer_name, subtotal, total, order_status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [organizationId, billNumber, studentId, eventId, customerName, subtotal, subtotal,
        req.organizationType === 'restaurant' ? 'pending' : 'completed', req.user.id]
    );
    for (const item of billItems) {
      await connection.execute(
        `INSERT INTO bill_items (organization_id, bill_id, menu_item_id, item_name, quantity, unit_price, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [organizationId, billResult.insertId, item.menuItemId, item.itemName, item.quantity, item.unitPrice, item.lineTotal]
      );
    }
    await connection.commit();
    res.status(201).json({
      id: billResult.insertId, billNumber, customerName, subtotal, total: subtotal,
      createdAt: new Date().toISOString(), items: billItems
    });
  } catch (error) {
    if (connection) await connection.rollback();
    next(error);
  } finally {
    if (connection) connection.release();
  }
});

export default router;
