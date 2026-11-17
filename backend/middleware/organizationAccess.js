import pool from '../config/db.js';
import { hasOrganizationModule, normalizeOrganizationType } from '../config/organizationTypes.js';

export function requireOrganizationModule(moduleName) {
  return async (req, res, next) => {
    try {
      const [[organization]] = await pool.execute(
        'SELECT organization_type FROM organizations WHERE id = ?',
        [req.user.organizationId]
      );
      if (!organization) return res.status(401).json({ error: 'Your organization is no longer available.' });
      req.organizationType = normalizeOrganizationType(organization.organization_type);
      if (!hasOrganizationModule(req.organizationType, moduleName)) {
        return res.status(403).json({ error: 'This module is not available for your organization type.' });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
