/**
 * Cloud Functions de GYMBAR.
 *
 * Se organiza por dominio (ver docs/09). Fase 1: identidad y bootstrap. Fase 2:
 * operaciones sensibles (dinero, vigencia, acceso) transaccionales.
 */
import { initializeApp } from 'firebase-admin/app';
import { onRequest } from 'firebase-functions/v2/https';

initializeApp();

export { setUserRole } from './admin/setUserRole.js';
export { createOrganization } from './admin/onOrganizationCreated.js';
export { renewMembership } from './operations/renewMembership.js';
export { registerCheckIn } from './operations/checkin.js';
export { openCashSession, addCashMovement, closeCashSession } from './operations/cashbox.js';
export { registerSale } from './operations/sales.js';

export const healthcheck = onRequest((_req, res) => {
  res.json({ ok: true, service: 'gymbar-functions', ts: Date.now() });
});
