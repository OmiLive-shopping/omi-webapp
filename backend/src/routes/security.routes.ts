import { Router } from 'express';

import { SecurityController } from '../socket/controllers/security.controller.js';

/**
 * Security monitoring and management routes
 * Provides API endpoints for WebSocket security dashboard and administration
 */
const router = Router();
const securityController = new SecurityController();

// Security metrics and monitoring
router.get('/metrics', securityController.getMetrics);
router.get('/audit-logs', securityController.getAuditLogs);
router.get('/dashboard', securityController.getDashboard);
router.get('/health', securityController.healthCheck);

// Security configuration
router.get('/config', securityController.getConfig);
router.put('/config', securityController.updateConfig);

// IP management
router.post('/block-ip', securityController.blockIP);
router.post('/unblock-ip', securityController.unblockIP);

// Reporting
router.get('/report', securityController.generateReport);

export default router;
