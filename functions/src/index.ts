/**
 * Cloud Functions de GYMBAR.
 *
 * Se organiza por dominio (ver docs/09). Fase 1: identidad y bootstrap de
 * organización. La lógica sensible de dinero (createPayment, closeCashSession…)
 * llega en la Fase 2.
 */
import { initializeApp } from 'firebase-admin/app';
import { onRequest } from 'firebase-functions/v2/https';

initializeApp();

export { setUserRole } from './admin/setUserRole.js';
export { createOrganization } from './admin/onOrganizationCreated.js';

export const healthcheck = onRequest((_req, res) => {
  res.json({ ok: true, service: 'gymbar-functions', ts: Date.now() });
});
