-- One-time, additive Calendar & Events upgrade.
-- Back up the database before applying. Existing accounts and records are retained.
USE optimeal;

ALTER TABLE organizations
  ADD COLUMN indian_state CHAR(2) NULL AFTER organization_type;

CREATE TABLE calendar_events (
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

CREATE TABLE public_holidays (
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

CREATE TABLE prediction_calendar_features (
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
