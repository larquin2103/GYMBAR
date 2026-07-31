/**
 * @gymbar/shared — contratos de dominio compartidos entre frontend y Cloud Functions.
 *
 * Fuente única de verdad para tipos, enums y schemas de validación (Zod). El
 * frontend valida formularios con estos schemas; las Cloud Functions validan las
 * entradas con los mismos, evitando divergencia entre cliente y servidor.
 */
export * from './enums.js';
export * from './money.js';
export * from './schemas/member.js';
export * from './schemas/plan.js';
export * from './schemas/membership.js';
export * from './schemas/payment.js';
