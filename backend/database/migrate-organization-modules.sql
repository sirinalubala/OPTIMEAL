-- One-time, additive upgrade for the seven organization-specific workspaces.
-- Back up the database before applying. Existing accounts and records are retained.
USE optimeal;

ALTER TABLE organizations
  MODIFY organization_type ENUM(
    'restaurant','college_mess','hostel_mess','corporate_cafeteria',
    'catering_service','hospital_canteen','other','cafeteria','catering'
  ) NOT NULL;

UPDATE organizations
SET organization_type = CASE organization_type
  WHEN 'cafeteria' THEN 'corporate_cafeteria'
  WHEN 'catering' THEN 'catering_service'
  ELSE organization_type
END;

CREATE TABLE operational_records (
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

CREATE TABLE meal_registrations (
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

ALTER TABLE bills
  ADD COLUMN event_record_id INT UNSIGNED NULL AFTER student_id,
  ADD COLUMN order_status ENUM('pending','preparing','ready','completed','cancelled') NOT NULL DEFAULT 'completed' AFTER total,
  ADD CONSTRAINT fk_bills_event FOREIGN KEY (event_record_id) REFERENCES operational_records(id) ON DELETE SET NULL,
  ADD INDEX idx_bills_event (organization_id, event_record_id);
