import { normalizeSearch, type MemberPatch, type NewMember } from '@gymbar/shared';
import type { Member } from '@/domain/member/member.entity';
import type { MemberQuery, MemberRepository, Page } from '@/domain/member/member.repository';
import {
  buildNewMember,
  generateAccessCode,
  generateMemberCode,
} from '@/domain/member/member.factory';
import { getDemoData } from '@/data/demo/demoStore';

/**
 * Repositorio en memoria respaldado por el store de demo compartido. Se usa
 * cuando Firebase no está configurado (dev/demo), para que la UI sea plenamente
 * interactiva y coherente con membresías/pagos/check-ins. También sirve de doble
 * de pruebas (con su propio store inyectable). Mismo contrato que el de Firestore.
 */
export class InMemoryMemberRepository implements MemberRepository {
  /** Store opcional para tests aislados; por defecto usa el store de demo. */
  private readonly override?: Map<string, Member[]>;

  constructor(seed?: Record<string, Member[]>) {
    if (seed) {
      this.override = new Map(Object.entries(seed).map(([k, v]) => [k, [...v]]));
    }
  }

  private list(orgId: string): Member[] {
    if (this.override) {
      let arr = this.override.get(orgId);
      if (!arr) {
        arr = [];
        this.override.set(orgId, arr);
      }
      return arr;
    }
    return getDemoData(orgId).members;
  }

  async getById(orgId: string, id: string): Promise<Member | null> {
    return this.list(orgId).find((m) => m.id === id) ?? null;
  }

  async getByAccessCode(orgId: string, accessCode: string): Promise<Member | null> {
    return this.list(orgId).find((m) => m.accessCode === accessCode) ?? null;
  }

  async search(orgId: string, query: MemberQuery): Promise<Page<Member>> {
    const limit = query.limit ?? 20;
    const term = query.search ? normalizeSearch(query.search) : '';
    let items = this.list(orgId).filter((m) => {
      const matchesTerm = term
        ? m.searchName.includes(term) || m.code.toLowerCase().includes(term)
        : true;
      const matchesStatus = query.status ? m.status === query.status : true;
      return matchesTerm && matchesStatus;
    });
    items = items.slice().sort((a, b) => a.searchName.localeCompare(b.searchName));

    const offset = query.cursor ? Number(query.cursor) : 0;
    const pageItems = items.slice(offset, offset + limit);
    const nextOffset = offset + limit;
    return {
      items: pageItems,
      nextCursor: nextOffset < items.length ? String(nextOffset) : null,
    };
  }

  async listForTrainer(orgId: string, trainerId: string | null): Promise<Member[]> {
    return this.list(orgId)
      .filter((m) => (trainerId ? m.trainerId === trainerId : true))
      .slice()
      .sort((a, b) => a.searchName.localeCompare(b.searchName));
  }

  private uniqueAccessCode(orgId: string): string {
    const list = this.list(orgId);
    for (let i = 0; i < 50; i++) {
      const code = generateAccessCode();
      if (!list.some((m) => m.accessCode === code)) return code;
    }
    return generateAccessCode();
  }

  /** Verifica que un PIN elegido no esté en uso por otro cliente. */
  private assertCodeFree(orgId: string, code: string, exceptId?: string): void {
    const taken = this.list(orgId).some((m) => m.accessCode === code && m.id !== exceptId);
    if (taken) throw new Error('Ese PIN ya está en uso por otro cliente');
  }

  async create(orgId: string, input: NewMember, photo?: Blob | null): Promise<Member> {
    const id = crypto.randomUUID();
    const photoUrl = photo ? URL.createObjectURL(photo) : null;
    let accessCode: string;
    if (input.accessCode) {
      this.assertCodeFree(orgId, input.accessCode);
      accessCode = input.accessCode;
    } else {
      accessCode = this.uniqueAccessCode(orgId);
    }
    const member = buildNewMember({ id, code: generateMemberCode(), accessCode, input, photoUrl });
    this.list(orgId).unshift(member);
    return member;
  }

  async update(orgId: string, id: string, patch: MemberPatch): Promise<void> {
    const arr = this.list(orgId);
    const idx = arr.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error('Cliente no encontrado');
    const prev = arr[idx]!;
    const firstName = patch.firstName?.trim() ?? prev.firstName;
    const lastName = patch.lastName?.trim() ?? prev.lastName;
    let accessCode = prev.accessCode;
    if (patch.accessCode) {
      this.assertCodeFree(orgId, patch.accessCode, id);
      accessCode = patch.accessCode;
    }
    arr[idx] = {
      ...prev,
      firstName,
      lastName,
      accessCode,
      searchName: normalizeSearch(`${firstName} ${lastName}`),
      phone: patch.phone !== undefined ? patch.phone.trim() || null : prev.phone,
      email: patch.email !== undefined ? patch.email.trim() || null : prev.email,
      goal: patch.goal !== undefined ? (patch.goal ?? null) : prev.goal,
      trainerId: patch.trainerId !== undefined ? patch.trainerId.trim() || null : prev.trainerId,
      notes: patch.notes !== undefined ? patch.notes.trim() || null : prev.notes,
      updatedAt: new Date(),
    };
  }
}
