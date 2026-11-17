CREATE DATABASE IF NOT EXISTS optimeal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE optimeal;

CREATE TABLE IF NOT EXISTS organizations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(140) NOT NULL,
  organization_type ENUM('restaurant','college_mess','hostel_mess','corporate_cafeteria','catering_service','hospital_canteen','other') NOT NULL,
  indian_state CHAR(2) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_organizations_name (name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id INT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  user_id VARCHAR(40) NOT NULL UNIQUE,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('owner','manager','staff') NOT NULL DEFAULT 'staff',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS students (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id INT UNSIGNED NOT NULL,
  student_code VARCHAR(40) NOT NULL,
  name VARCHAR(120) NOT NULL,
  department VARCHAR(100) NOT NULL,
  year_level TINYINT UNSIGNED NOT NULL,
  contact VARCHAR(40) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_students_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT chk_student_year CHECK (year_level BETWEEN 1 AND 8),
  UNIQUE KEY uq_students_org_code (organization_id, student_code),
  INDEX idx_students_department (organization_id, department),
  INDEX idx_students_name (organization_id, name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS operational_records (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id INT UNSIGNED NOT NULL,
  record_type ENUM('customer','employee','client','resident','hospital_contact','event') NOT NULL,
  name VARCHAR(120) NOT NULL,
  reference VARCHAR(80) NULL,
  contact VARCHAR(120) NULL,
  department VARCHAR(100) NULL,
  room VARCHAR(80) NULL,
  event_date DATE NULL,
  meal_type ENUM('breakfast','lunch','dinner','snacks') NULL,
  venue VARCHAR(140) NULL,
  guest_count INT UNSIGNED NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'active',
  menu_plan TEXT NULL,
  preparation_plan TEXT NULL,
  notes VARCHAR(1000) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_operational_records_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  INDEX idx_operational_records_type_name (organization_id, record_type, name),
  INDEX idx_operational_records_event_date (organization_id, record_type, event_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS meal_registrations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id INT UNSIGNED NOT NULL,
  person_type ENUM('student','employee','resident') NOT NULL,
  person_id INT UNSIGNED NOT NULL,
  attendee_name VARCHAR(120) NOT NULL,
  meal_date DATE NOT NULL,
  meal_type ENUM('breakfast','lunch','dinner','snacks') NOT NULL,
  status ENUM('registered','served','absent') NOT NULL DEFAULT 'registered',
  notes VARCHAR(500) NULL,
  recorded_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_meal_registrations_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_meal_registrations_user FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_meal_registration_person (organization_id, person_type, person_id, meal_date, meal_type),
  INDEX idx_meal_registrations_date (organization_id, meal_date, meal_type)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS menu_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id INT UNSIGNED NOT NULL,
  item_name VARCHAR(120) NOT NULL,
  meal_type ENUM('breakfast','lunch','dinner','snacks') NOT NULL,
  menu_date DATE NOT NULL,
  quantity INT UNSIGNED NOT NULL DEFAULT 0,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_menu_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT chk_menu_price CHECK (price >= 0),
  UNIQUE KEY uq_menu_item_day (organization_id, item_name, meal_type, menu_date),
  INDEX idx_menu_date_meal (organization_id, menu_date, meal_type)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attendance (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id INT UNSIGNED NOT NULL,
  attendance_date DATE NOT NULL,
  meal_type ENUM('breakfast','lunch','dinner','snacks') NOT NULL,
  expected_diners INT UNSIGNED NOT NULL DEFAULT 0,
  actual_diners INT UNSIGNED NOT NULL DEFAULT 0,
  meals_prepared INT UNSIGNED NOT NULL DEFAULT 0,
  notes VARCHAR(500) NULL,
  recorded_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_attendance_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_user FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_attendance_day_meal (organization_id, attendance_date, meal_type),
  INDEX idx_attendance_date (organization_id, attendance_date),
  INDEX idx_attendance_meal_date (organization_id, meal_type, attendance_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventory (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id INT UNSIGNED NOT NULL,
  ingredient_name VARCHAR(120) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  unit VARCHAR(30) NOT NULL,
  min_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_inventory_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT chk_inventory_quantity CHECK (quantity >= 0),
  CONSTRAINT chk_inventory_min_stock CHECK (min_stock >= 0),
  UNIQUE KEY uq_inventory_org_ingredient (organization_id, ingredient_name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bills (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id INT UNSIGNED NOT NULL,
  bill_number VARCHAR(32) NOT NULL UNIQUE,
  student_id INT UNSIGNED NULL,
  event_record_id INT UNSIGNED NULL,
  customer_name VARCHAR(120) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  order_status ENUM('pending','preparing','ready','completed','cancelled') NOT NULL DEFAULT 'completed',
  created_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bills_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_bills_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL,
  CONSTRAINT fk_bills_event FOREIGN KEY (event_record_id) REFERENCES operational_records(id) ON DELETE SET NULL,
  CONSTRAINT fk_bills_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_bill_totals CHECK (subtotal >= 0 AND total >= 0),
  INDEX idx_bills_created (organization_id, created_at),
  INDEX idx_bills_event (organization_id, event_record_id),
  INDEX idx_bills_student (organization_id, student_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bill_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id INT UNSIGNED NOT NULL,
  bill_id INT UNSIGNED NOT NULL,
  menu_item_id INT UNSIGNED NULL,
  item_name VARCHAR(120) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_bill_items_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_bill_items_bill FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
  CONSTRAINT fk_bill_items_menu FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE SET NULL,
  CONSTRAINT chk_bill_item_values CHECK (quantity > 0 AND unit_price >= 0 AND line_total >= 0),
  INDEX idx_bill_items_bill (organization_id, bill_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS predictions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id INT UNSIGNED NOT NULL,
  target_date DATE NOT NULL,
  meal_type ENUM('breakfast','lunch','dinner','snacks') NOT NULL,
  predicted_diners INT UNSIGNED NOT NULL,
  recommended_quantity INT UNSIGNED NOT NULL,
  estimated_surplus INT NOT NULL,
  model_name VARCHAR(80) NOT NULL,
  insight VARCHAR(500) NOT NULL,
  created_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_predictions_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_predictions_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_predictions_target (organization_id, target_date, meal_type),
  INDEX idx_predictions_created (organization_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS calendar_events (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id INT UNSIGNED NOT NULL,
  event_date DATE NOT NULL,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(1000) NULL,
  event_type ENUM('holiday','festival','weekend','special_event','working_day') NOT NULL,
  is_open TINYINT(1) NOT NULL,
  expected_count INT UNSIGNED NULL,
  meal_type ENUM('breakfast','lunch','dinner','snacks') NULL,
  created_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_calendar_events_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_calendar_events_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_calendar_event (organization_id, event_date, name, event_type),
  INDEX idx_calendar_events_date (organization_id, event_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS public_holidays (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  holiday_date DATE NOT NULL,
  state_code CHAR(2) NOT NULL,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(500) NULL,
  event_type ENUM('holiday','festival') NOT NULL,
  provider_type VARCHAR(24) NOT NULL,
  source VARCHAR(40) NOT NULL DEFAULT 'date-holidays',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_public_holiday (holiday_date, state_code, name),
  INDEX idx_public_holidays_date_state (holiday_date, state_code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS prediction_calendar_features (
  prediction_id INT UNSIGNED PRIMARY KEY,
  organization_id INT UNSIGNED NOT NULL,
  target_date DATE NOT NULL,
  weekday TINYINT UNSIGNED NOT NULL,
  is_weekend TINYINT(1) NOT NULL,
  is_holiday TINYINT(1) NOT NULL,
  is_festival TINYINT(1) NOT NULL,
  is_special_event TINYINT(1) NOT NULL,
  is_open TINYINT(1) NULL,
  expected_count INT UNSIGNED NULL,
  menu_item_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  normal_working_day_average DECIMAL(10,2) NULL,
  holiday_names JSON NULL,
  event_names JSON NULL,
  CONSTRAINT fk_prediction_calendar_prediction FOREIGN KEY (prediction_id) REFERENCES predictions(id) ON DELETE CASCADE,
  CONSTRAINT fk_prediction_calendar_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  INDEX idx_prediction_calendar_org_date (organization_id, target_date)
) ENGINE=InnoDB;
