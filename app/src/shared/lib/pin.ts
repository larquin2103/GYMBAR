/**
 * Hash de PIN para el inicio de sesión de usuarios internos.
 *
 * El PIN es una comodidad de acceso, no una frontera de seguridad: la frontera
 * real es la cuenta de nube del gimnasio (uid == orgId) y sus Reglas. Aun así,
 * no se guarda el PIN en claro: se almacena SHA-256(salt · pin). El salt es el
 * id del usuario, para que dos PIN iguales no compartan hash.
 */
export async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Compara un PIN contra su hash almacenado. */
export async function verifyPinHash(
  pin: string,
  salt: string,
  storedHash: string | null | undefined,
): Promise<boolean> {
  if (!storedHash) return false;
  const h = await hashPin(pin, salt);
  return h === storedHash;
}

/** Valida el formato del PIN (4 a 6 dígitos). */
export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}
