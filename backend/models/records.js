const validDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export const recordDefinitions = {
  students: {
    table: 'students',
    columns: ['student_code', 'name', 'department', 'year_level', 'contact'],
    required: ['student_code', 'name', 'department', 'year_level'],
    search: ['student_code', 'name', 'department'],
    orderBy: 'name ASC',
    validate: (body) => Number.isInteger(Number(body.year_level))
      && Number(body.year_level) >= 1 && Number(body.year_level) <= 8
  },
  customers: {
    table: 'operational_records',
    recordType: 'customer',
    columns: ['name', 'reference', 'contact', 'notes'],
    required: ['name'],
    search: ['name', 'reference', 'contact'],
    orderBy: 'name ASC'
  },
  employees: {
    table: 'operational_records',
    recordType: 'employee',
    columns: ['name', 'reference', 'department', 'contact', 'status', 'notes'],
    required: ['name'],
    search: ['name', 'reference', 'department'],
    orderBy: 'name ASC',
    defaults: { status: 'active' }
  },
  clients: {
    table: 'operational_records',
    recordType: 'client',
    columns: ['name', 'reference', 'contact', 'notes'],
    required: ['name'],
    search: ['name', 'reference', 'contact'],
    orderBy: 'name ASC'
  },
  residents: {
    table: 'operational_records',
    recordType: 'resident',
    columns: ['name', 'reference', 'room', 'contact', 'status', 'notes'],
    required: ['name'],
    search: ['name', 'reference', 'room'],
    orderBy: 'room ASC, name ASC',
    defaults: { status: 'active' }
  },
  hospital_contacts: {
    table: 'operational_records',
    recordType: 'hospital_contact',
    columns: ['name', 'reference', 'department', 'contact', 'status', 'notes'],
    required: ['name'],
    search: ['name', 'reference', 'department'],
    orderBy: 'name ASC',
    defaults: { status: 'active' }
  },
  events: {
    table: 'operational_records',
    recordType: 'event',
    columns: ['name', 'event_date', 'meal_type', 'guest_count', 'venue', 'status', 'menu_plan', 'preparation_plan', 'notes'],
    required: ['name', 'event_date', 'guest_count'],
    search: ['name', 'venue', 'status'],
    orderBy: 'event_date DESC, name ASC',
    defaults: { status: 'planned' },
    validate: (body) => validDate(body.event_date)
      && Number.isInteger(Number(body.guest_count)) && Number(body.guest_count) >= 0
      && (!body.meal_type || ['breakfast', 'lunch', 'dinner', 'snacks'].includes(body.meal_type))
      && (!body.status || ['planned', 'confirmed', 'completed', 'cancelled'].includes(body.status))
  },
  menu: {
    table: 'menu_items',
    columns: ['item_name', 'meal_type', 'menu_date', 'quantity', 'price'],
    required: ['item_name', 'meal_type', 'menu_date', 'quantity', 'price'],
    search: ['item_name', 'meal_type'],
    orderBy: 'menu_date DESC, meal_type ASC, item_name ASC',
    validate: (body) => ['breakfast', 'lunch', 'dinner', 'snacks'].includes(body.meal_type)
      && validDate(body.menu_date)
      && Number.isInteger(Number(body.quantity)) && Number(body.quantity) >= 0
      && Number.isFinite(Number(body.price)) && Number(body.price) >= 0
  },
  inventory: {
    table: 'inventory',
    columns: ['ingredient_name', 'quantity', 'unit', 'min_stock'],
    required: ['ingredient_name', 'quantity', 'unit', 'min_stock'],
    search: ['ingredient_name'],
    orderBy: 'ingredient_name ASC',
    validate: (body) => Number.isFinite(Number(body.quantity)) && Number(body.quantity) >= 0
      && Number.isFinite(Number(body.min_stock)) && Number(body.min_stock) >= 0
  },
  attendance: {
    table: 'attendance',
    columns: ['attendance_date', 'meal_type', 'expected_diners', 'actual_diners', 'meals_prepared', 'notes'],
    required: ['attendance_date', 'meal_type', 'expected_diners', 'actual_diners', 'meals_prepared'],
    search: ['meal_type', 'notes'],
    orderBy: 'attendance_date DESC, meal_type ASC',
    validate: (body) => ['breakfast', 'lunch', 'dinner', 'snacks'].includes(body.meal_type)
      && validDate(body.attendance_date)
      && ['expected_diners', 'actual_diners', 'meals_prepared'].every((key) => Number.isInteger(Number(body[key])) && Number(body[key]) >= 0)
  }
};
