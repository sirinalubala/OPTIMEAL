import pool from '../config/db.js';
import { getCalendarContext, getCalendarRange, isValidCalendarDate } from './calendar.js';

const mealTypes = ['breakfast', 'lunch', 'dinner', 'snacks'];

function httpError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function solveLinearSystem(matrix, vector) {
  const size = vector.length;
  const augmented = matrix.map((row, i) => [...row, vector[i]]);
  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    }
    if (Math.abs(augmented[pivot][column]) < 1e-10) return null;
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const divisor = augmented[column][column];
    for (let j = column; j <= size; j += 1) augmented[column][j] /= divisor;
    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      for (let j = column; j <= size; j += 1) augmented[row][j] -= factor * augmented[column][j];
    }
  }
  return augmented.map((row) => row[size]);
}

function contextForDay(day, mealType) {
  const events = day.events.filter((event) => event.mealType === null || event.mealType === mealType);
  const organizationEvents = events.filter((event) => event.source === 'organization');
  return {
    date: day.date,
    weekday: day.weekday,
    isWeekend: day.isWeekend,
    isOpen: organizationEvents.some((event) => event.isOpen === false)
      ? false
      : organizationEvents.some((event) => event.isOpen === true) ? true : null,
    expectedCount: organizationEvents.reduce((sum, event) => sum + (event.expectedCount || 0), 0) || null,
    isHoliday: events.some((event) => event.eventType === 'holiday'),
    isFestival: events.some((event) => event.eventType === 'festival'),
    isSpecialEvent: events.some((event) => event.eventType === 'special_event'),
    holidayNames: events.filter((event) => ['holiday', 'festival'].includes(event.eventType)).map((event) => event.name),
    eventNames: organizationEvents.map((event) => event.name)
  };
}

function featureVector(date, context, baselineDate) {
  const epochDays = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000);
  const baselineDays = Math.floor(Date.parse(`${baselineDate}T00:00:00Z`) / 86400000);
  const angle = (2 * Math.PI * context.weekday) / 7;
  return [
    1,
    (epochDays - baselineDays) / 365,
    Math.sin(angle),
    Math.cos(angle),
    context.isWeekend ? 1 : 0,
    context.isHoliday ? 1 : 0,
    context.isFestival ? 1 : 0,
    context.isSpecialEvent ? 1 : 0,
    context.isOpen === false ? -1 : context.isOpen === true ? 0.25 : 0,
    Math.min(10, Number(context.expectedCount || 0) / 100)
  ];
}

function fitRegression(records, contexts, baselineDate) {
  const width = 10;
  const matrix = Array.from({ length: width }, () => Array(width).fill(0));
  const vector = Array(width).fill(0);
  for (const record of records) {
    const x = featureVector(record.attendance_date, contexts.get(record.attendance_date), baselineDate);
    for (let row = 0; row < width; row += 1) {
      vector[row] += x[row] * Number(record.actual_diners);
      for (let column = 0; column < width; column += 1) matrix[row][column] += x[row] * x[column];
    }
  }
  for (let index = 1; index < width; index += 1) matrix[index][index] += 0.1;
  return solveLinearSystem(matrix, vector);
}

async function loadHistory({ organizationId, organizationType, mealType, date }) {
  const lowerDate = new Date(`${date}T00:00:00Z`);
  lowerDate.setUTCDate(lowerDate.getUTCDate() - 365);
  const from = lowerDate.toISOString().slice(0, 10);
  if (organizationType === 'restaurant') {
    const [rows] = await pool.execute(
      `SELECT DATE(b.created_at) AS attendance_date, SUM(bi.quantity) AS actual_diners,
              SUM(bi.quantity) AS meals_prepared, SUM(bi.quantity) AS expected_diners
       FROM bills b
       JOIN bill_items bi ON bi.organization_id = b.organization_id AND bi.bill_id = b.id
       JOIN menu_items m ON m.organization_id = bi.organization_id AND m.id = bi.menu_item_id
       WHERE b.organization_id = ? AND m.meal_type = ? AND DATE(b.created_at) >= ? AND DATE(b.created_at) < ?
         AND b.order_status != 'cancelled'
       GROUP BY DATE(b.created_at) ORDER BY attendance_date DESC LIMIT 180`,
      [organizationId, mealType, from, date]
    );
    return { records: rows, sourceLabel: 'recorded menu-item sales' };
  }
  if (organizationType === 'catering_service') {
    const [rows] = await pool.execute(
      `SELECT event_date AS attendance_date, SUM(guest_count) AS actual_diners,
              SUM(guest_count) AS meals_prepared, SUM(guest_count) AS expected_diners
       FROM operational_records
       WHERE organization_id = ? AND record_type = 'event' AND meal_type = ?
         AND event_date >= ? AND event_date < ? AND status != 'cancelled'
       GROUP BY event_date ORDER BY attendance_date DESC LIMIT 180`,
      [organizationId, mealType, from, date]
    );
    return { records: rows, sourceLabel: 'historical catering event guest counts' };
  }
  const [rows] = await pool.execute(
    `SELECT attendance_date, actual_diners, meals_prepared, expected_diners
     FROM attendance
     WHERE organization_id = ? AND meal_type = ? AND attendance_date >= ? AND attendance_date < ?
     ORDER BY attendance_date DESC LIMIT 180`,
    [organizationId, mealType, from, date]
  );
  return { records: rows, sourceLabel: 'historical attendance and consumption records' };
}

async function forecastMeal({ date, mealType, organizationId, organizationType }) {
  const [historyResult, calendar, menuResult] = await Promise.all([
    loadHistory({ organizationId, organizationType, mealType, date }),
    getCalendarContext({ organizationId, date, mealType }),
    pool.execute(
      `SELECT id, item_name, quantity FROM menu_items
       WHERE organization_id = ? AND menu_date = ? AND meal_type = ?
       ORDER BY item_name`,
      [organizationId, date, mealType]
    )
  ]);
  const history = historyResult.records;
  const [menuItems] = menuResult;
  const menuQuantity = menuItems.reduce((sum, item) => sum + Number(item.quantity), 0);
  const resultBase = {
    targetDate: date,
    mealType,
    calendar: {
      isWeekend: calendar.isWeekend,
      isHoliday: calendar.isHoliday,
      isFestival: calendar.isFestival,
      isSpecialEvent: calendar.isSpecialEvent,
      isOpen: calendar.isOpen,
      expectedCount: calendar.expectedCount,
      holidayNames: calendar.holidayNames,
      eventNames: calendar.eventNames
    },
    menuItems: menuItems.map((item) => ({
      id: Number(item.id),
      name: item.item_name,
      plannedQuantity: Number(item.quantity)
    })),
    menuItemCount: menuItems.length,
    plannedMenuQuantity: menuQuantity,
    trainingRecords: history.length,
    dataSource: historyResult.sourceLabel
  };

  if (calendar.isOpen === false) {
    return {
      ...resultBase,
      status: 'closed',
      predictedDiners: 0,
      recommendedQuantity: 0,
      estimatedSurplus: 0,
      possibleShortage: 0,
      normalWorkingDayAverage: null,
      modelName: 'Organization closure',
      insight: `The organization is marked closed on ${date}; no meal preparation is recommended.`
    };
  }

  let contexts = new Map();
  let normalRecords = [];
  let coefficients = null;
  let baselineDate = date;
  if (history.length) {
    const historyDates = history.map((row) => row.attendance_date).sort();
    baselineDate = historyDates[0];
    const calendarRange = await getCalendarRange({
      organizationId,
      from: historyDates[0],
      to: historyDates[historyDates.length - 1]
    });
    const historyByDate = new Map(history.map((record) => [record.attendance_date, record]));
    contexts = new Map(calendarRange.days
      .filter((day) => historyByDate.has(day.date))
      .map((day) => {
        const context = contextForDay(day, mealType);
        const normalDay = !context.isWeekend && !context.isHoliday && !context.isFestival
          && !context.isSpecialEvent && context.isOpen !== false;
        if (normalDay) normalRecords.push(Number(historyByDate.get(day.date).actual_diners));
        return [day.date, context];
      }));
    if (history.length >= 5) coefficients = fitRegression(history, contexts, baselineDate);
  }

  const normalAverage = normalRecords.length
    ? normalRecords.reduce((sum, value) => sum + value, 0) / normalRecords.length
    : history.length
      ? history.reduce((sum, row) => sum + Number(row.actual_diners), 0) / history.length
      : null;

  if (history.length < 5 || !coefficients) {
    if (!calendar.expectedCount) {
      return {
        ...resultBase,
        status: 'insufficient_data',
        message: `Add at least five past ${mealType} records, or enter an expected attendance count for a calendar event, to estimate demand.`,
        normalWorkingDayAverage: normalAverage
      };
    }
    const expected = calendar.expectedCount;
    return {
      ...resultBase,
      status: 'estimate',
      predictedDiners: expected,
      recommendedQuantity: expected,
      estimatedSurplus: 0,
      possibleShortage: menuItems.length ? Math.max(0, expected - menuQuantity) : null,
      normalWorkingDayAverage: normalAverage,
      modelName: 'Event-based estimate (not trained AI)',
      insight: `This basic estimate uses the ${expected} expected attendees entered for this event. It is not a trained AI forecast.`
    };
  }

  const targetFeatures = featureVector(date, calendar, baselineDate);
  const rawForecast = targetFeatures.reduce((sum, value, index) => sum + value * coefficients[index], 0);
  const predictedDiners = Math.max(0, Math.round(rawForecast));
  const preparedRecords = history.filter((row) => Number(row.meals_prepared) > 0);
  const wasteRatio = preparedRecords.length
    ? Math.min(0.18, Math.max(0, preparedRecords.reduce(
      (sum, row) => sum + Math.max(0, Number(row.meals_prepared) - Number(row.actual_diners)) / Number(row.meals_prepared), 0
    ) / preparedRecords.length))
    : 0;
  const recommendedQuantity = Math.ceil(predictedDiners / (1 - wasteRatio));
  const estimatedSurplus = Math.max(0, recommendedQuantity - predictedDiners);
  const possibleShortage = menuItems.length ? Math.max(0, predictedDiners - menuQuantity) : null;
  const comparison = normalAverage === null ? '' : ` Normal working-day average: ${Math.round(normalAverage)} portions.`;
  const insight = `${mealType[0].toUpperCase()}${mealType.slice(1)} demand is forecast at ${predictedDiners} portions using ${history.length} ${historyResult.sourceLabel} and calendar features.${comparison}`;
  return {
    ...resultBase,
    status: 'trained',
    predictedDiners,
    recommendedQuantity,
    estimatedSurplus,
    possibleShortage,
    normalWorkingDayAverage: normalAverage === null ? null : Math.round(normalAverage * 100) / 100,
    modelName: 'Calendar-aware ridge regression',
    insight
  };
}

function validateDateAndMeal(date, mealType) {
  if (!isValidCalendarDate(date)) throw httpError('Choose a valid prediction date.');
  if (!mealTypes.includes(mealType)) throw httpError('Choose a valid meal type.');
}

export async function previewPredictions({ date, organizationId, organizationType }) {
  if (!isValidCalendarDate(date)) throw httpError('Choose a valid prediction date.');
  const meals = await Promise.all(mealTypes.map((mealType) => forecastMeal({
    date,
    mealType,
    organizationId,
    organizationType
  })));
  return { targetDate: date, meals };
}

export async function makePrediction({ date, mealType, userId, organizationId, organizationType }) {
  validateDateAndMeal(date, mealType);
  const forecast = await forecastMeal({ date, mealType, organizationId, organizationType });
  if (forecast.status === 'insufficient_data') throw httpError(forecast.message, 422);

  const [insert] = await pool.execute(
    `INSERT INTO predictions
      (organization_id, target_date, meal_type, predicted_diners, recommended_quantity, estimated_surplus, model_name, insight, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      organizationId, date, mealType, forecast.predictedDiners, forecast.recommendedQuantity,
      forecast.estimatedSurplus, forecast.modelName, forecast.insight.slice(0, 500), userId
    ]
  );
  await pool.execute(
    `INSERT INTO prediction_calendar_features
      (prediction_id, organization_id, target_date, weekday, is_weekend, is_holiday, is_festival,
       is_special_event, is_open, expected_count, menu_item_count, normal_working_day_average,
       holiday_names, event_names)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      insert.insertId, organizationId, date, new Date(`${date}T00:00:00Z`).getUTCDay(),
      Number(forecast.calendar.isWeekend), Number(forecast.calendar.isHoliday),
      Number(forecast.calendar.isFestival), Number(forecast.calendar.isSpecialEvent),
      forecast.calendar.isOpen === null ? null : Number(forecast.calendar.isOpen),
      forecast.calendar.expectedCount, forecast.menuItemCount, forecast.normalWorkingDayAverage,
      JSON.stringify(forecast.calendar.holidayNames), JSON.stringify(forecast.calendar.eventNames)
    ]
  );
  return { id: insert.insertId, ...forecast };
}
