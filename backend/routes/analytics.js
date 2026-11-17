import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { requireOrganizationModule } from '../middleware/organizationAccess.js';
import { hasOrganizationModule } from '../config/organizationTypes.js';
import { currentIndianDate, getCalendarRange } from '../services/calendar.js';

const router = Router();
router.use(authenticate);
router.use(requireOrganizationModule('reports'));

router.get('/dashboard', async (req, res, next) => {
  try {
    const organizationId = req.user.organizationId;
    const type = req.organizationType;
    const result = {
      students: 0,
      customers: 0,
      employees: 0,
      residents: 0,
      clients: 0,
      hospitalContacts: 0,
      events: 0,
      eventGuests: 0,
      ordersToday: 0,
      salesToday: 0,
      expected: 0,
      consumed: 0,
      prepared: 0,
      remaining: 0,
      wastePercent: 0,
      wasteMeals: 0,
      lowStock: 0,
      inventory: 0,
      billingTotal: 0,
      weekly: [],
      mealStats: [],
      latestPrediction: null,
      recentActivity: [],
      calendar: null
    };
    const calendarToday = currentIndianDate();
    const calendarEnd = new Date(`${calendarToday}T00:00:00Z`);
    calendarEnd.setUTCDate(calendarEnd.getUTCDate() + 30);
    const calendarRange = await getCalendarRange({
      organizationId,
      from: calendarToday,
      to: calendarEnd.toISOString().slice(0, 10)
    });
    const todayCalendar = calendarRange.days[0];
    const upcomingCalendarEvents = calendarRange.days.slice(1).flatMap((day) => day.events
      .filter((event) => ['holiday', 'festival', 'special_event'].includes(event.eventType))
      .map((event) => ({ ...event, date: day.date })));
    result.calendar = {
      date: calendarToday,
      dayName: new Date(`${calendarToday}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'UTC' }),
      stateCode: calendarRange.stateCode,
      todayEvents: todayCalendar.events,
      upcomingHolidays: upcomingCalendarEvents
        .filter((event) => ['holiday', 'festival'].includes(event.eventType))
        .slice(0, 5),
      upcomingSpecialEvents: upcomingCalendarEvents
        .filter((event) => event.eventType === 'special_event')
        .slice(0, 5)
    };

    if (hasOrganizationModule(type, 'students')) {
      const [[row]] = await pool.execute(
        'SELECT COUNT(*) AS total FROM students WHERE organization_id = ?',
        [organizationId]
      );
      result.students = Number(row.total);
    }
    for (const [moduleName, key, recordType] of [
      ['customers', 'customers', 'customer'],
      ['employees', 'employees', 'employee'],
      ['residents', 'residents', 'resident'],
      ['clients', 'clients', 'client'],
      ['hospital_contacts', 'hospitalContacts', 'hospital_contact'],
      ['events', 'events', 'event']
    ]) {
      if (!hasOrganizationModule(type, moduleName)) continue;
      const [[row]] = await pool.execute(
        `SELECT COUNT(*) AS total, COALESCE(SUM(guest_count), 0) AS guests
         FROM operational_records WHERE organization_id = ? AND record_type = ?`,
        [organizationId, recordType]
      );
      result[key] = Number(row.total);
      if (moduleName === 'events') result.eventGuests = Number(row.guests);
    }
    if (hasOrganizationModule(type, 'customers')) {
      const [[historical]] = await pool.execute(
        `SELECT COUNT(DISTINCT b.customer_name) AS total FROM bills b
         WHERE b.organization_id = ? AND NOT EXISTS (
           SELECT 1 FROM operational_records r
           WHERE r.organization_id = b.organization_id AND r.record_type = 'customer'
             AND r.name = b.customer_name
         )`,
        [organizationId]
      );
      result.customers += Number(historical.total);
    }
    if (hasOrganizationModule(type, 'events')) {
      const [[upcoming]] = await pool.execute(
        `SELECT COUNT(*) AS total, COALESCE(SUM(guest_count), 0) AS guests
         FROM operational_records
         WHERE organization_id = ? AND record_type = 'event'
           AND event_date >= CURDATE() AND status != 'cancelled'`,
        [organizationId]
      );
      result.events = Number(upcoming.total);
      result.eventGuests = Number(upcoming.guests);
    }

    if (hasOrganizationModule(type, 'attendance')) {
      const [[today]] = await pool.execute(
        `SELECT COALESCE(SUM(expected_diners), 0) AS expected,
                COALESCE(SUM(actual_diners), 0) AS consumed,
                COALESCE(SUM(meals_prepared), 0) AS prepared
         FROM attendance WHERE organization_id = ? AND attendance_date = CURDATE()`,
        [organizationId]
      );
      const [[waste]] = await pool.execute(
        `SELECT COALESCE(SUM(GREATEST(meals_prepared - actual_diners, 0)), 0) AS wasted,
                COALESCE(SUM(meals_prepared), 0) AS prepared
         FROM attendance WHERE organization_id = ?
           AND attendance_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`,
        [organizationId]
      );
      const [week] = await pool.execute(
        `SELECT DATE_FORMAT(attendance_date, '%Y-%m-%d') AS date,
                SUM(meals_prepared) AS prepared, SUM(actual_diners) AS consumed
         FROM attendance WHERE organization_id = ?
           AND attendance_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
         GROUP BY attendance_date ORDER BY attendance_date`,
        [organizationId]
      );
      const [meals] = await pool.execute(
        `SELECT meal_type AS meal, COALESCE(SUM(meals_prepared), 0) AS prepared,
                COALESCE(SUM(actual_diners), 0) AS consumed
         FROM attendance WHERE organization_id = ?
           AND attendance_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
         GROUP BY meal_type ORDER BY FIELD(meal_type,'breakfast','lunch','dinner','snacks')`,
        [organizationId]
      );
      result.expected = Number(today.expected);
      result.consumed = Number(today.consumed);
      result.prepared = Number(today.prepared);
      result.remaining = Math.max(0, result.prepared - result.consumed);
      result.wasteMeals = Number(waste.wasted);
      result.wastePercent = Number(waste.prepared)
        ? Math.round(result.wasteMeals / Number(waste.prepared) * 1000) / 10
        : 0;
      result.weekly = week;
      result.mealStats = meals;
    }

    if (type === 'restaurant') {
      const [[sales]] = await pool.execute(
        `SELECT COUNT(*) AS orders, COALESCE(SUM(total), 0) AS revenue
         FROM bills WHERE organization_id = ? AND DATE(created_at) = CURDATE()
           AND order_status != 'cancelled'`,
        [organizationId]
      );
      result.ordersToday = Number(sales.orders);
      result.salesToday = Number(sales.revenue);
    }
    const [[inventory]] = await pool.execute(
      'SELECT COUNT(*) AS total, SUM(quantity <= min_stock) AS low_stock FROM inventory WHERE organization_id = ?',
      [organizationId]
    );
    const billingTotal = hasOrganizationModule(type, 'billing')
      ? await pool.execute(
        'SELECT COALESCE(SUM(total), 0) AS total FROM bills WHERE organization_id = ?',
        [organizationId]
      )
      : [[{ total: 0 }]];
    const [[prediction]] = await pool.execute(
      'SELECT * FROM predictions WHERE organization_id = ? ORDER BY created_at DESC LIMIT 1',
      [organizationId]
    );
    result.inventory = Number(inventory.total);
    result.lowStock = Number(inventory.low_stock || 0);
    result.billingTotal = Number(billingTotal[0][0].total);
    result.latestPrediction = prediction || null;

    const [billActivity] = hasOrganizationModule(type, 'billing')
      ? await pool.execute(
        `SELECT 'Billing' AS type, CONCAT('Invoice for ', customer_name) AS description, created_at AS occurredAt
         FROM bills WHERE organization_id = ? ORDER BY created_at DESC LIMIT 5`,
        [organizationId]
      )
      : [[]];
    const [menuActivity] = await pool.execute(
      `SELECT 'Menu' AS type, CONCAT('Menu item added: ', item_name) AS description, created_at AS occurredAt
       FROM menu_items WHERE organization_id = ? ORDER BY created_at DESC LIMIT 5`,
      [organizationId]
    );
    const [predictionActivity] = await pool.execute(
      `SELECT 'Prediction' AS type, CONCAT(meal_type, ' forecast generated') AS description, created_at AS occurredAt
       FROM predictions WHERE organization_id = ? ORDER BY created_at DESC LIMIT 5`,
      [organizationId]
    );
    const [inventoryActivity] = await pool.execute(
      `SELECT 'Inventory' AS type, CONCAT('Inventory updated: ', ingredient_name) AS description, updated_at AS occurredAt
       FROM inventory WHERE organization_id = ? ORDER BY updated_at DESC LIMIT 5`,
      [organizationId]
    );
    const activity = [...billActivity, ...menuActivity, ...predictionActivity, ...inventoryActivity];
    const operationalTypeLabels = {
      customers: ['customer', 'Customer'],
      employees: ['employee', 'Employee'],
      residents: ['resident', 'Resident'],
      clients: ['client', 'Client'],
      hospital_contacts: ['hospital_contact', 'Staff / customer'],
      events: ['event', 'Event']
    };
    const allowedRecordTypes = Object.entries(operationalTypeLabels)
      .filter(([moduleName]) => moduleName !== 'events' && hasOrganizationModule(type, moduleName));
    if (allowedRecordTypes.length) {
      const [recordActivity] = await pool.execute(
        `SELECT CASE record_type ${allowedRecordTypes.map(() => 'WHEN ? THEN ?').join(' ')} END AS type,
                CONCAT('Record added: ', name) AS description, created_at AS occurredAt
         FROM operational_records WHERE organization_id = ? AND record_type IN (${allowedRecordTypes.map(() => '?').join(',')})
         ORDER BY created_at DESC LIMIT 5`,
        [
          ...allowedRecordTypes.flatMap(([moduleName]) => operationalTypeLabels[moduleName]),
          organizationId,
          ...allowedRecordTypes.map(([moduleName]) => operationalTypeLabels[moduleName][0])
        ]
      );
      activity.push(...recordActivity);
    }
    if (hasOrganizationModule(type, 'students')) {
      const [studentActivity] = await pool.execute(
        `SELECT 'Student' AS type, CONCAT('Student added: ', name) AS description, created_at AS occurredAt
         FROM students WHERE organization_id = ? ORDER BY created_at DESC LIMIT 5`,
        [organizationId]
      );
      activity.push(...studentActivity);
    }
    if (hasOrganizationModule(type, 'attendance')) {
      const [attendanceActivity] = await pool.execute(
        `SELECT 'Attendance' AS type, CONCAT(meal_type, ' meal record saved') AS description, created_at AS occurredAt
         FROM attendance WHERE organization_id = ? ORDER BY created_at DESC LIMIT 5`,
        [organizationId]
      );
      activity.push(...attendanceActivity);
    }
    if (hasOrganizationModule(type, 'events')) {
      const [eventActivity] = await pool.execute(
        `SELECT 'Event' AS type, CONCAT('Event planned: ', name) AS description, created_at AS occurredAt
         FROM operational_records WHERE organization_id = ? AND record_type = 'event'
         ORDER BY created_at DESC LIMIT 5`,
        [organizationId]
      );
      activity.push(...eventActivity);
    }
    result.recentActivity = activity
      .sort((left, right) => new Date(right.occurredAt) - new Date(left.occurredAt))
      .slice(0, 8);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/reports', async (req, res, next) => {
  try {
    const period = String(req.query.period || 'week');
    const intervals = { day: 0, week: 6, month: 29 };
    if (!(period in intervals)) return res.status(400).json({ error: 'Period must be day, week, or month.' });
    const organizationId = req.user.organizationId;
    const days = intervals[period];
    const type = req.organizationType;
    let billing = [];
    let revenue = { bill_count: 0, revenue: 0 };
    if (hasOrganizationModule(type, 'billing')) {
      [billing] = await pool.execute(
        `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS date, COUNT(*) AS bills,
                COALESCE(SUM(total), 0) AS revenue
         FROM bills WHERE organization_id = ?
           AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
           AND order_status != 'cancelled'
         GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d') ORDER BY date`,
        [organizationId, days]
      );
      [[revenue]] = await pool.execute(
        `SELECT COUNT(*) AS bill_count, COALESCE(SUM(total), 0) AS revenue
         FROM bills WHERE organization_id = ?
           AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
           AND order_status != 'cancelled'`,
        [organizationId, days]
      );
    }
    let attendance = [];
    let chart = [];
    let eventSummary = { eventCount: 0, eventGuests: 0 };
    let mealSummary = { prepared: 0, consumed: 0, wasted: 0, wastePercent: 0 };
    if (type === 'restaurant') {
      const [sales] = await pool.execute(
        `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS date, COUNT(*) AS orders,
                COALESCE(SUM(total), 0) AS revenue
         FROM bills WHERE organization_id = ?
           AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
           AND order_status != 'cancelled'
         GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d') ORDER BY date`,
        [organizationId, days]
      );
      chart = sales;
      const averageOrder = Number(revenue.bill_count)
        ? Number(revenue.revenue) / Number(revenue.bill_count)
        : 0;
      return res.json({
        period, attendance, billing, chart, sales,
        summary: {
          ...mealSummary,
          billCount: Number(revenue.bill_count),
          revenue: Number(revenue.revenue),
          averageOrder
        }
      });
    }
    if (type === 'catering_service') {
      const [events] = await pool.execute(
        `SELECT DATE_FORMAT(event_date, '%Y-%m-%d') AS date,
                COUNT(*) AS events, COALESCE(SUM(guest_count), 0) AS guests
         FROM operational_records
         WHERE organization_id = ? AND record_type = 'event'
           AND event_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
           AND status != 'cancelled'
         GROUP BY event_date ORDER BY event_date`,
        [organizationId, days]
      );
      chart = events;
      eventSummary = {
        eventCount: events.reduce((sum, item) => sum + Number(item.events), 0),
        eventGuests: events.reduce((sum, item) => sum + Number(item.guests), 0)
      };
    } else if (hasOrganizationModule(type, 'attendance')) {
      [attendance] = await pool.execute(
        `SELECT DATE_FORMAT(attendance_date, '%Y-%m-%d') AS date,
                SUM(expected_diners) AS expected, SUM(actual_diners) AS consumed,
                SUM(meals_prepared) AS prepared,
                SUM(GREATEST(meals_prepared - actual_diners, 0)) AS wasted
         FROM attendance
         WHERE organization_id = ? AND attendance_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
         GROUP BY attendance_date ORDER BY attendance_date`,
        [organizationId, days]
      );
      chart = attendance;
      const totals = attendance.reduce((sum, row) => ({
        prepared: sum.prepared + Number(row.prepared),
        consumed: sum.consumed + Number(row.consumed),
        wasted: sum.wasted + Number(row.wasted)
      }), { prepared: 0, consumed: 0, wasted: 0 });
      mealSummary = {
        ...totals,
        wastePercent: totals.prepared
          ? Math.round(totals.wasted / totals.prepared * 1000) / 10
          : 0
      };
    }
    res.json({
      period, attendance, billing, chart, sales: [],
      summary: {
        ...mealSummary,
        ...eventSummary,
        billCount: Number(revenue.bill_count),
        revenue: Number(revenue.revenue)
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
