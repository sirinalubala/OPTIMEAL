export const organizationTypes = {
  restaurant: {
    label: 'Restaurant',
    primaryResource: 'customers',
    primaryLabel: 'Customers',
    modules: ['customers', 'menu', 'inventory', 'orders', 'sales', 'calendar', 'predictions', 'billing', 'reports']
  },
  college_mess: {
    label: 'College / University Mess',
    primaryResource: 'students',
    primaryLabel: 'Students',
    modules: ['students', 'registrations', 'menu', 'attendance', 'inventory', 'calendar', 'predictions', 'reports']
  },
  hostel_mess: {
    label: 'Hostel Mess',
    primaryResource: 'residents',
    primaryLabel: 'Residents',
    modules: ['students', 'residents', 'registrations', 'menu', 'attendance', 'inventory', 'calendar', 'predictions', 'reports']
  },
  corporate_cafeteria: {
    label: 'Corporate Cafeteria',
    primaryResource: 'employees',
    primaryLabel: 'Employees',
    modules: ['employees', 'registrations', 'menu', 'attendance', 'inventory', 'calendar', 'predictions', 'billing', 'reports']
  },
  catering_service: {
    label: 'Catering Service',
    primaryResource: 'clients',
    primaryLabel: 'Clients',
    modules: ['clients', 'events', 'menu', 'inventory', 'calendar', 'predictions', 'billing', 'reports']
  },
  hospital_canteen: {
    label: 'Hospital / Institutional Canteen',
    primaryResource: 'hospital_contacts',
    primaryLabel: 'Staff / Customers',
    modules: ['hospital_contacts', 'menu', 'attendance', 'inventory', 'calendar', 'predictions', 'billing', 'reports']
  },
  other: {
    label: 'Other',
    primaryResource: 'customers',
    primaryLabel: 'Customers',
    modules: ['customers', 'menu', 'attendance', 'inventory', 'calendar', 'predictions', 'billing', 'reports']
  }
};

const legacyTypeAliases = {
  cafeteria: 'corporate_cafeteria',
  catering: 'catering_service'
};

export function normalizeOrganizationType(type) {
  return legacyTypeAliases[type] || type;
}

export function getOrganizationProfile(type) {
  return organizationTypes[normalizeOrganizationType(type)] || organizationTypes.other;
}

export function hasOrganizationModule(type, moduleName) {
  return getOrganizationProfile(type).modules.includes(moduleName);
}
