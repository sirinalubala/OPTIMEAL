import Holidays from 'date-holidays';
import pool from '../config/db.js';

export const indianStates = [
  ['AN', 'Andaman and Nicobar Islands'], ['AP', 'Andhra Pradesh'],
  ['AR', 'Arunachal Pradesh'], ['AS', 'Assam'], ['BR', 'Bihar'],
  ['CH', 'Chandigarh'], ['CT', 'Chhattisgarh'], ['DD', 'Daman and Diu'],
  ['DL', 'Delhi'], ['DN', 'Dadra and Nagar Haveli'], ['GA', 'Goa'],
  ['GJ', 'Gujarat'], ['HP', 'Himachal Pradesh'], ['HR', 'Haryana'],
  ['JK', 'Jammu and Kashmir'], ['KA', 'Karnataka'], ['KL', 'Kerala'],
  ['LD', 'Lakshadweep'], ['MH', 'Maharashtra'], ['ML', 'Meghalaya'],
  ['MN', 'Manipur'], ['MP', 'Madhya Pradesh'], ['MZ', 'Mizoram'],
  ['NL', 'Nagaland'], ['OR', 'Odisha'], ['PB', 'Punjab'],
  ['PY', 'Puducherry'], ['RJ', 'Rajasthan'], ['SK', 'Sikkim'],
  ['TG', 'Telangana'], ['TN', 'Tamil Nadu'], ['TR', 'Tripura'],
  ['UP', 'Uttar Pradesh'], ['UT', 'Uttarakhand'], ['WB', 'West Bengal']
];
const syncedHolidayCalendars = new Map();

export function isValidCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function currentIndianDate() {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function httpError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function addDays(date, count) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + count);
  return next.toISOString().slice(0, 10);
}

async function syncPublicHolidays(year, stateCode) {
  const cacheKey = `${year}:${stateCode || ''}`;
  if (syncedHolidayCalendars.has(cacheKey)) return syncedHolidayCalendars.get(cacheKey);
  const sync = (async () => {
    const national = new Holidays('IN', undefined, 'en').getHolidays(year);
    const nationalKeys = new Set(national.map((holiday) => `${holiday.date.slice(0, 10)}:${holiday.name}`));
    const sources = [['IN', national]];
    if (stateCode) {
      const regional = new Holidays('IN', stateCode, 'en').getHolidays(year)
        .filter((holiday) => !nationalKeys.has(`${holiday.date.slice(0, 10)}:${holiday.name}`));
      sources.push([stateCode, regional]);
    }

    for (const [sourceState, holidays] of sources) {
      for (const holiday of holidays) {
        const eventDate = holiday.date.slice(0, 10);
        const eventType = holiday.type === 'observance' ? 'festival' : 'holiday';
        await pool.execute(
          `INSERT INTO public_holidays
            (holiday_date, state_code, name, description, event_type, provider_type)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE description = VALUES(description),
             event_type = VALUES(event_type), provider_type = VALUES(provider_type)`,
          [eventDate, sourceState, holiday.name, holiday.note || null, eventType, holiday.type || 'public']
        );
      }
    }
  })();
  syncedHolidayCalendars.set(cacheKey, sync);
  try {
    await sync;
  } catch (error) {
    syncedHolidayCalendars.delete(cacheKey);
    throw error;
  }
}

export async function getCalendarRange({ organizationId, from, to }) {
  if (!isValidCalendarDate(from) || !isValidCalendarDate(to) || from > to) {
    throw httpError('Choose a valid calendar date range.');
  }
  const rangeLength = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000;
  if (rangeLength > 365) throw httpError('Calendar ranges cannot exceed one year.');

  const [[organization]] = await pool.execute(
    'SELECT indian_state FROM organizations WHERE id = ?',
    [organizationId]
  );
  if (!organization) throw httpError('Your organization is no longer available.', 401);
  const stateCode = organization.indian_state;
  const firstYear = Number(from.slice(0, 4));
  const lastYear = Number(to.slice(0, 4));
  for (let year = firstYear; year <= lastYear; year += 1) {
    await syncPublicHolidays(year, stateCode);
  }

  const stateFilter = stateCode ? "state_code IN ('IN', ?)" : "state_code = 'IN'";
  const holidayParams = stateCode ? [from, to, stateCode] : [from, to];
  const [holidays] = await pool.execute(
    `SELECT holiday_date, state_code, name, description, event_type, provider_type
     FROM public_holidays
     WHERE holiday_date BETWEEN ? AND ? AND ${stateFilter}
     ORDER BY CASE WHEN state_code = ? THEN 0 ELSE 1 END, name`,
    stateCode ? [...holidayParams, stateCode] : [...holidayParams, 'IN']
  );
  const [organizationEvents] = await pool.execute(
    `SELECT id, event_date, name, description, event_type, is_open, expected_count, meal_type
     FROM calendar_events
     WHERE organization_id = ? AND event_date BETWEEN ? AND ?
     ORDER BY event_date, name`,
    [organizationId, from, to]
  );

  const byDate = new Map();
  function addEvent(event) {
    const list = byDate.get(event.date) || [];
    list.push(event);
    byDate.set(event.date, list);
  }
  for (const holiday of holidays) {
    addEvent({
      id: `holiday-${holiday.state_code}-${holiday.holiday_date}-${holiday.name}`,
      date: holiday.holiday_date,
      name: holiday.name,
      description: holiday.description,
      eventType: holiday.event_type,
      isOpen: null,
      expectedCount: null,
      mealType: null,
      source: 'public',
      providerType: holiday.provider_type,
      stateCode: holiday.state_code
    });
  }
  for (const event of organizationEvents) {
    addEvent({
      id: Number(event.id),
      date: event.event_date,
      name: event.name,
      description: event.description,
      eventType: event.event_type,
      isOpen: Boolean(event.is_open),
      expectedCount: event.expected_count === null ? null : Number(event.expected_count),
      mealType: event.meal_type,
      source: 'organization'
    });
  }

  const days = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    const events = byDate.get(date) || [];
    const isWeekend = weekday === 0 || weekday === 6;
    if (isWeekend) {
      events.push({
        id: `weekend-${date}`,
        date,
        name: weekday === 0 ? 'Sunday' : 'Saturday',
        description: null,
        eventType: 'weekend',
        isOpen: null,
        expectedCount: null,
        mealType: null,
        source: 'calendar'
      });
    }
    const statusEvents = events.filter((event) => event.source === 'organization');
    const isOpen = statusEvents.some((event) => event.isOpen === false)
      ? false
      : statusEvents.some((event) => event.isOpen === true) ? true : null;
    days.push({
      date,
      weekday,
      isWeekend,
      isOpen,
      expectedCount: statusEvents.reduce((sum, event) => sum + (event.expectedCount || 0), 0) || null,
      events: events.sort((left, right) => left.eventType.localeCompare(right.eventType) || left.name.localeCompare(right.name))
    });
  }
  return {
    stateCode,
    states: indianStates.map(([code, name]) => ({ code, name })),
    days
  };
}

export async function getCalendarContext({ organizationId, date, mealType }) {
  if (!isValidCalendarDate(date)) throw httpError('Choose a valid calendar date.');
  const { stateCode, days } = await getCalendarRange({
    organizationId,
    from: date,
    to: date
  });
  const day = days[0];
  const events = mealType
    ? day.events.filter((event) => event.mealType === null || event.mealType === mealType)
    : day.events;
  const organizationEvents = events.filter((event) => event.source === 'organization');
  const isOpen = organizationEvents.some((event) => event.isOpen === false)
    ? false
    : organizationEvents.some((event) => event.isOpen === true) ? true : null;
  return {
    date,
    weekday: day.weekday,
    isWeekend: day.isWeekend,
    isOpen,
    expectedCount: organizationEvents.reduce((sum, event) => sum + (event.expectedCount || 0), 0) || null,
    stateCode,
    events,
    isHoliday: events.some((event) => event.eventType === 'holiday'),
    isFestival: events.some((event) => event.eventType === 'festival'),
    isSpecialEvent: events.some((event) => event.eventType === 'special_event'),
    holidayNames: events.filter((event) => ['holiday', 'festival'].includes(event.eventType)).map((event) => event.name),
    eventNames: organizationEvents.map((event) => event.name)
  };
}
