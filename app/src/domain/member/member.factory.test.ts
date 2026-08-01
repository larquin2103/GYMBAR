import { describe, expect, it } from 'vitest';
import { buildNewMember, generateMemberCode } from './member.factory';

describe('buildNewMember', () => {
  it('normaliza el nombre de búsqueda (minúsculas, sin acentos)', () => {
    const m = buildNewMember({
      id: '1',
      code: 'M-1000',
      accessCode: '1234',
      input: { firstName: 'Lucía', lastName: 'Fernández' },
    });
    expect(m.searchName).toBe('lucia fernandez');
  });

  it('un cliente sin membresía arranca en estado pending', () => {
    const m = buildNewMember({
      id: '1',
      code: 'M-1',
      accessCode: '1234',
      input: { firstName: 'Ana', lastName: 'Ruiz' },
    });
    expect(m.status).toBe('pending');
    expect(m.currentMembershipId).toBeNull();
    expect(m.membershipEndDate).toBeNull();
  });

  it('recorta espacios y normaliza campos vacíos a null', () => {
    const m = buildNewMember({
      id: '1',
      code: 'M-1',
      accessCode: '1234',
      input: { firstName: '  Juan ', lastName: ' Pérez ', phone: '', email: '', notes: '  ' },
    });
    expect(m.firstName).toBe('Juan');
    expect(m.lastName).toBe('Pérez');
    expect(m.phone).toBeNull();
    expect(m.email).toBeNull();
    expect(m.notes).toBeNull();
  });
});

describe('generateMemberCode', () => {
  it('genera un código con prefijo M-', () => {
    expect(generateMemberCode()).toMatch(/^M-\d{4}$/);
  });
});
