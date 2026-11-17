export const organizationProfiles = {
  restaurant: {
    label: 'Restaurant',
    primaryResource: 'customers',
    primaryLabel: 'Customers',
    chartTitle: 'Daily sales',
    chartDescription: 'Revenue recorded from active orders',
    chartUnit: 'REVENUE / DAY',
    chartSeries: [['revenue', 'Revenue'], ['orders', 'Orders']],
    stats: [
      ['Customers', 'customers'],
      ['Orders today', 'ordersToday'],
      ['Sales today', 'salesToday', 'currency'],
      ['Inventory items', 'inventory']
    ],
    quickActions: [
      ['New order', '/orders'],
      ['Manage customers', '/customers'],
      ['Update inventory', '/inventory'],
      ['View sales', '/sales']
    ],
    navigation: [
      ['customers', '/customers', 'Customer Management', 'users'],
      ['menu', '/menu', 'Menu Management', 'menu'],
      ['orders', '/orders', 'Orders Management', 'orders'],
      ['sales', '/sales', 'Daily Sales', 'sales'],
      ['inventory', '/inventory', 'Inventory', 'inventory'],
      ['calendar', '/calendar', 'Calendar & Events', 'calendar'],
      ['predictions', '/predictions', 'AI Food Demand', 'predictions'],
      ['billing', '/billing', 'Billing & Invoices', 'billing'],
      ['reports', '/reports', 'Revenue & Waste Reports', 'reports']
    ]
  },
  college_mess: {
    label: 'College / University Mess',
    primaryResource: 'students',
    primaryLabel: 'Students',
    chartTitle: 'Meals prepared & served',
    chartDescription: 'Daily portions from attendance records',
    chartUnit: 'PORTIONS / DAY',
    chartSeries: [['prepared', 'Prepared'], ['consumed', 'Consumed']],
    stats: [
      ['Students', 'students'],
      ['Expected diners today', 'expected'],
      ['Meals prepared today', 'prepared'],
      ['Meals consumed today', 'consumed'],
      ['Food waste', 'wastePercent', 'percent'],
      ['Inventory items', 'inventory']
    ],
    quickActions: [
      ['Add student', '/students'],
      ['Record attendance', '/attendance'],
      ['Manage menu', '/menu'],
      ['View calendar', '/calendar']
    ],
    navigation: [
      ['students', '/students', 'Student Management', 'users'],
      ['attendance', '/attendance', 'Student Attendance', 'attendance'],
      ['menu', '/menu', 'Menu Management', 'menu'],
      ['inventory', '/inventory', 'Inventory', 'inventory'],
      ['calendar', '/calendar', 'Calendar & Events', 'calendar'],
      ['predictions', '/predictions', 'AI Meal Demand', 'predictions'],
      ['reports', '/reports', 'Student Meal Analytics', 'reports']
    ]
  },
  hostel_mess: {
    label: 'Hostel Mess',
    primaryResource: 'residents',
    primaryLabel: 'Residents',
    chartTitle: 'Meals prepared & served',
    chartDescription: 'Daily portions from attendance records',
    chartUnit: 'PORTIONS / DAY',
    chartSeries: [['prepared', 'Prepared'], ['consumed', 'Consumed']],
    stats: [
      ['Hostel residents', 'residents'],
      ['Expected diners today', 'expected'],
      ['Meals prepared today', 'prepared'],
      ['Meals consumed today', 'consumed'],
      ['Food waste', 'wastePercent', 'percent'],
      ['Inventory items', 'inventory']
    ],
    quickActions: [
      ['Manage residents', '/residents'],
      ['Record attendance', '/attendance'],
      ['Manage menu', '/menu'],
      ['View calendar', '/calendar']
    ],
    navigation: [
      ['students', '/students', 'Student Management', 'users'],
      ['residents', '/residents', 'Hostel Residents', 'users'],
      ['attendance', '/attendance', 'Daily Attendance', 'attendance'],
      ['menu', '/menu', 'Menu Management', 'menu'],
      ['inventory', '/inventory', 'Inventory', 'inventory'],
      ['calendar', '/calendar', 'Calendar & Events', 'calendar'],
      ['predictions', '/predictions', 'AI Meal Demand', 'predictions'],
      ['reports', '/reports', 'Mess Reports', 'reports']
    ]
  },
  corporate_cafeteria: {
    label: 'Corporate Cafeteria',
    primaryResource: 'employees',
    primaryLabel: 'Employees',
    chartTitle: 'Meals registered & served',
    chartDescription: 'Daily portions from attendance records',
    chartUnit: 'PORTIONS / DAY',
    chartSeries: [['prepared', 'Prepared'], ['consumed', 'Consumed']],
    stats: [
      ['Employees', 'employees'],
      ['Expected diners today', 'expected'],
      ['Meals prepared today', 'prepared'],
      ['Meal registrations today', 'consumed'],
      ['Food waste', 'wastePercent', 'percent'],
      ['Inventory items', 'inventory'],
      ['Billing total', 'billingTotal', 'currency']
    ],
    quickActions: [
      ['Manage employees', '/employees'],
      ['Register meals', '/attendance'],
      ['Manage menu', '/menu'],
      ['View meal analytics', '/reports']
    ],
    navigation: [
      ['employees', '/employees', 'Employee Management', 'users'],
      ['attendance', '/attendance', 'Meal Registration', 'attendance'],
      ['menu', '/menu', 'Menu Management', 'menu'],
      ['inventory', '/inventory', 'Inventory', 'inventory'],
      ['calendar', '/calendar', 'Calendar & Events', 'calendar'],
      ['predictions', '/predictions', 'AI Meal Demand', 'predictions'],
      ['billing', '/billing', 'Billing', 'billing'],
      ['reports', '/reports', 'Employee Meal Analytics', 'reports']
    ]
  },
  catering_service: {
    label: 'Catering Service',
    primaryResource: 'clients',
    primaryLabel: 'Clients',
    chartTitle: 'Event guest counts',
    chartDescription: 'Guests planned across upcoming events',
    chartUnit: 'GUESTS / EVENT',
    chartSeries: [['guests', 'Guests']],
    stats: [
      ['Clients', 'clients'],
      ['Events', 'events'],
      ['Planned guests', 'eventGuests'],
      ['Inventory items', 'inventory'],
      ['Billing total', 'billingTotal', 'currency']
    ],
    quickActions: [
      ['Plan an event', '/events'],
      ['Manage clients', '/clients'],
      ['Update inventory', '/inventory'],
      ['Create event billing', '/billing']
    ],
    navigation: [
      ['clients', '/clients', 'Client Management', 'users'],
      ['events', '/events', 'Event Management', 'events'],
      ['menu', '/menu', 'Menu Planning', 'menu'],
      ['inventory', '/inventory', 'Inventory', 'inventory'],
      ['calendar', '/calendar', 'Calendar & Events', 'calendar'],
      ['predictions', '/predictions', 'AI Food Demand', 'predictions'],
      ['billing', '/billing', 'Event Billing', 'billing'],
      ['reports', '/reports', 'Event Reports', 'reports']
    ]
  },
  hospital_canteen: {
    label: 'Hospital / Institutional Canteen',
    primaryResource: 'hospital_contacts',
    primaryLabel: 'Staff / Customers',
    chartTitle: 'Meals prepared & served',
    chartDescription: 'Daily portions from meal records',
    chartUnit: 'PORTIONS / DAY',
    chartSeries: [['prepared', 'Prepared'], ['consumed', 'Consumed']],
    stats: [
      ['Staff / customers', 'hospitalContacts'],
      ['Expected diners today', 'expected'],
      ['Meals prepared today', 'prepared'],
      ['Meals consumed today', 'consumed'],
      ['Food waste', 'wastePercent', 'percent'],
      ['Inventory items', 'inventory'],
      ['Billing total', 'billingTotal', 'currency']
    ],
    quickActions: [
      ['Manage staff / customers', '/hospital_contacts'],
      ['Record meals', '/attendance'],
      ['Manage menu', '/menu'],
      ['View consumption reports', '/reports']
    ],
    navigation: [
      ['hospital_contacts', '/hospital_contacts', 'Staff / Customer Management', 'users'],
      ['attendance', '/attendance', 'Daily Meal Records', 'attendance'],
      ['menu', '/menu', 'Menu Management', 'menu'],
      ['inventory', '/inventory', 'Inventory', 'inventory'],
      ['calendar', '/calendar', 'Calendar & Events', 'calendar'],
      ['predictions', '/predictions', 'AI Food Demand', 'predictions'],
      ['billing', '/billing', 'Billing', 'billing'],
      ['reports', '/reports', 'Consumption & Waste Reports', 'reports']
    ]
  },
  other: {
    label: 'Other',
    primaryResource: 'customers',
    primaryLabel: 'Customers',
    chartTitle: 'Food preparation & consumption',
    chartDescription: 'Daily portions from preparation records',
    chartUnit: 'PORTIONS / DAY',
    chartSeries: [['prepared', 'Prepared'], ['consumed', 'Consumed']],
    stats: [
      ['Customers', 'customers'],
      ['Expected diners today', 'expected'],
      ['Meals prepared today', 'prepared'],
      ['Meals consumed today', 'consumed'],
      ['Food waste', 'wastePercent', 'percent'],
      ['Inventory items', 'inventory'],
      ['Billing total', 'billingTotal', 'currency']
    ],
    quickActions: [
      ['Manage customers', '/customers'],
      ['Manage menu', '/menu'],
      ['Record preparation', '/attendance'],
      ['Update inventory', '/inventory']
    ],
    navigation: [
      ['customers', '/customers', 'Customer Management', 'users'],
      ['menu', '/menu', 'Menu Management', 'menu'],
      ['attendance', '/attendance', 'Food Preparation', 'attendance'],
      ['inventory', '/inventory', 'Inventory', 'inventory'],
      ['calendar', '/calendar', 'Calendar & Events', 'calendar'],
      ['predictions', '/predictions', 'AI Food Demand', 'predictions'],
      ['billing', '/billing', 'Billing', 'billing'],
      ['reports', '/reports', 'Reports', 'reports']
    ]
  }
};

export function organizationProfile(type) {
  const canonicalType = type === 'cafeteria'
    ? 'corporate_cafeteria'
    : type === 'catering' ? 'catering_service' : type;
  return organizationProfiles[canonicalType] || organizationProfiles.other;
}

export function hasOrganizationModule(type, moduleName) {
  if (moduleName === 'profile' || moduleName === 'dashboard') return true;
  if (moduleName === 'registrations') {
    return ['college_mess', 'hostel_mess', 'corporate_cafeteria'].includes(
      type === 'cafeteria' ? 'corporate_cafeteria' : type
    );
  }
  return organizationProfile(type).navigation.some(([module]) => module === moduleName);
}
