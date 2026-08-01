import { normalizeSearch, type MemberPatch, type NewMember } from '@gymbar/shared';
import type { Member } from '@/domain/member/member.entity';
import type { MemberQuery, MemberRepository, Page } from '@/domain/member/member.repository';
import { buildNewMember, generateMemberCode } from '@/domain/member/member.factory';

/**
 * Repositorio en memoria. Se usa cuando Firebase no está configurado (dev/demo),
 * para que la UI sea plenamente interactiva sin backend. También sirve de doble
 * de pruebas. Implementa exactamente el mismo contrato que el de Firestore.
 */
export class InMemoryMemberRepository implements MemberRepository {
  private byOrg = new Map<string, Member[]>();

  constructor(seed?: Record<string, Member[]>) {
    if (seed) {
      for (const [orgId, members] of Object.entries(seed)) {
        this.byOrg.set(orgId, [...members]);
      }
    }
  }

  private list(orgId: string): Member[] {
    let arr = this.byOrg.get(orgId);
    if (!arr) {
      arr = [];
      this.byOrg.set(orgId, arr);
    }
    return arr;
  }

  async getById(orgId: string, id: string): Promise<Member | null> {
    return this.list(orgId).find((m) => m.id === id) ?? null;
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
    items = items.sort((a, b) => a.searchName.localeCompare(b.searchName));

    const offset = query.cursor ? Number(query.cursor) : 0;
    const pageItems = items.slice(offset, offset + limit);
    const nextOffset = offset + limit;
    return {
      items: pageItems,
      nextCursor: nextOffset < items.length ? String(nextOffset) : null,
    };
  }

  async create(orgId: string, input: NewMember, photo?: Blob | null): Promise<Member> {
    const id = crypto.randomUUID();
    const photoUrl = photo ? URL.createObjectURL(photo) : null;
    const member = buildNewMember({ id, code: generateMemberCode(), input, photoUrl });
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
    arr[idx] = {
      ...prev,
      firstName,
      lastName,
      searchName: normalizeSearch(`${firstName} ${lastName}`),
      phone: patch.phone !== undefined ? patch.phone.trim() || null : prev.phone,
      email: patch.email !== undefined ? patch.email.trim() || null : prev.email,
      notes: patch.notes !== undefined ? patch.notes.trim() || null : prev.notes,
      updatedAt: new Date(),
    };
  }
}
