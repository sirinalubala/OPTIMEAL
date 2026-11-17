-- One-time upgrade from the original single-workspace OptiMeal schema.
-- Back up the database first. Existing records are preserved in one legacy workspace.
USE optimeal;

CREATE TABLE organizations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(140) NOT NULL,
  organization_type ENUM('restaurant','college_mess','hostel_mess','cafeteria','catering','other') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_organizations_name (name)
) ENGINE=InnoDB;

INSERT INTO organizations (name, organization_type)
SELECT 'Existing workspace', 'other'
WHERE EXISTS (SELECT 1 FROM users)
   OR EXISTS (SELECT 1 FROM students)
   OR EXISTS (SELECT 1 FROM menu_items)
   OR EXISTS (SELECT 1 FROM attendance)
   OR EXISTS (SELECT 1 FROM inventory)
   OR EXISTS (SELECT 1 FROM bills)
   OR EXISTS (SELECT 1 FROM predictions);

SET @legacy_organization_id = (SELECT id FROM organizations WHERE name = 'Existing workspace' ORDER BY id LIMIT 1);

ALTER TABLE users
  ADD COLUMN organization_id INT UNSIGNED NULL,
  ADD COLUMN user_id VARCHAR(40) NULL;
ALTER TABLE students ADD COLUMN organization_id INT UNSIGNED NULL;
ALTER TABLE menu_items ADD COLUMN organization_id INT UNSIGNED NULL;
ALTER TABLE attendance ADD COLUMN organization_id INT UNSIGNED NULL;
ALTER TABLE inventory ADD COLUMN organization_id INT UNSIGNED NULL;
ALTER TABLE bills ADD COLUMN organization_id INT UNSIGNED NULL;
ALTER TABLE bill_items ADD COLUMN organization_id INT UNSIGNED NULL;
ALTER TABLE predictions ADD COLUMN organization_id INT UNSIGNED NULL;

UPDATE users
SET organization_id = @legacy_organization_id,
    user_id = CONCAT('legacy-', id);
UPDATE students SET organization_id = @legacy_organization_id;
UPDATE menu_items SET organization_id = @legacy_organization_id;
UPDATE attendance SET organization_id = @legacy_organization_id;
UPDATE inventory SET organization_id = @legacy_organization_id;
UPDATE bills SET organization_id = @legacy_organization_id;
UPDATE bill_items items
JOIN bills ON bills.id = items.bill_id
SET items.organization_id = bills.organization_id;
UPDATE predictions SET organization_id = @legacy_organization_id;

-- Remove the previously documented demo login; keep other legacy accounts and records.
DELETE FROM users WHERE email = 'admin@optimeal.local';
UPDATE users SET role = 'owner' WHERE role = 'admin';
ALTER TABLE users
  MODIFY organization_id INT UNSIGNED NOT NULL,
  MODIFY user_id VARCHAR(40) NOT NULL,
  MODIFY role ENUM('owner','manager','staff') NOT NULL DEFAULT 'staff',
  ADD UNIQUE KEY uq_users_user_id (user_id),
  ADD CONSTRAINT fk_users_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE students
  DROP INDEX student_code,
  MODIFY organization_id INT UNSIGNED NOT NULL,
  ADD UNIQUE KEY uq_students_org_code (organization_id, student_code),
  ADD CONSTRAINT fk_students_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE menu_items
  DROP INDEX uq_menu_item_day,
  MODIFY organization_id INT UNSIGNED NOT NULL,
  ADD UNIQUE KEY uq_menu_item_day (organization_id, item_name, meal_type, menu_date),
  ADD CONSTRAINT fk_menu_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE attendance
  DROP INDEX uq_attendance_day_meal,
  MODIFY organization_id INT UNSIGNED NOT NULL,
  ADD UNIQUE KEY uq_attendance_day_meal (organization_id, attendance_date, meal_type),
  ADD CONSTRAINT fk_attendance_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE inventory
  DROP INDEX ingredient_name,
  MODIFY organization_id INT UNSIGNED NOT NULL,
  ADD UNIQUE KEY uq_inventory_org_ingredient (organization_id, ingredient_name),
  ADD CONSTRAINT fk_inventory_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE bills
  MODIFY organization_id INT UNSIGNED NOT NULL,
  ADD CONSTRAINT fk_bills_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  ADD INDEX idx_bills_student (organization_id, student_id);
ALTER TABLE bill_items
  MODIFY organization_id INT UNSIGNED NOT NULL,
  ADD CONSTRAINT fk_bill_items_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  ADD INDEX idx_bill_items_org_bill (organization_id, bill_id);
ALTER TABLE predictions
  MODIFY organization_id INT UNSIGNED NOT NULL,
  ADD CONSTRAINT fk_predictions_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  ADD INDEX idx_predictions_org_target (organization_id, target_date, meal_type);
