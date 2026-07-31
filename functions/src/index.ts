/**
 * Cloud Functions de GYMBAR.
 *
 * Fase 0: solo el esqueleto y un healthcheck. La lógica sensible (createPayment,
 * closeCashSession, setUserRole, updateCounters…) se implementa por dominio en
 * las fases correspondientes (ver docs/09 y docs/12). Cada dominio vivirá en su
 * carpeta (payments/, cashbox/, admin/, stats/, notifications/).
 */
import { onRequest } from 'firebase-functions/v2/https';

export const healthcheck = onRequest((_req, res) => {
  res.json({ ok: true, service: 'gymbar-functions', ts: Date.now() });
});
