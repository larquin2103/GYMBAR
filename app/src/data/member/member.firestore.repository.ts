import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as fbLimit,
  orderBy,
  query as fbQuery,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  type Firestore,
  type QueryConstraint,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes, type FirebaseStorage } from 'firebase/storage';
import { normalizeSearch, type MemberPatch, type NewMember } from '@gymbar/shared';
import type { Member } from '@/domain/member/member.entity';
import type { MemberQuery, MemberRepository, Page } from '@/domain/member/member.repository';
import { buildNewMember, generateMemberCode } from '@/domain/member/member.factory';
import { memberFromDoc, memberToDoc } from './member.mapper';

/**
 * Implementación Firestore del repositorio de clientes (detalle reemplazable).
 * Rutas bajo /organizations/{orgId}/members (aislamiento estructural, docs/04).
 */
export class FirestoreMemberRepository implements MemberRepository {
  constructor(
    private readonly db: Firestore,
    private readonly storage: FirebaseStorage,
  ) {}

  private membersCol(orgId: string) {
    return collection(this.db, 'organizations', orgId, 'members');
  }

  async getById(orgId: string, id: string): Promise<Member | null> {
    const snap = await getDoc(doc(this.membersCol(orgId), id));
    return snap.exists() ? memberFromDoc(snap.id, snap.data()) : null;
  }

  async search(orgId: string, query: MemberQuery): Promise<Page<Member>> {
    const pageSize = query.limit ?? 20;
    const constraints: QueryConstraint[] = [];

    if (query.status) constraints.push(where('status', '==', query.status));

    // Búsqueda por prefijo sobre searchName normalizado (índice: searchName).
    if (query.search) {
      const term = normalizeSearch(query.search);
      constraints.push(orderBy('searchName'));
      constraints.push(where('searchName', '>=', term));
      constraints.push(where('searchName', '<=', term + '\uf8ff'));
    } else {
      constraints.push(orderBy('searchName'));
    }

    if (query.cursor) constraints.push(startAfter(query.cursor));
    constraints.push(fbLimit(pageSize));

    const snap = await getDocs(fbQuery(this.membersCol(orgId), ...constraints));
    const items = snap.docs.map((d) => memberFromDoc(d.id, d.data()));
    const last = snap.docs.at(-1);
    return {
      items,
      nextCursor: snap.size === pageSize && last ? last.get('searchName') : null,
    };
  }

  async create(orgId: string, input: NewMember, photo?: Blob | null): Promise<Member> {
    const ref0 = doc(this.membersCol(orgId));
    let photoUrl: string | null = null;
    if (photo) {
      const storageRef = ref(this.storage, `${orgId}/members/${ref0.id}/photo`);
      await uploadBytes(storageRef, photo);
      photoUrl = await getDownloadURL(storageRef);
    }
    const member = buildNewMember({ id: ref0.id, code: generateMemberCode(), input, photoUrl });
    await setDoc(ref0, {
      ...memberToDoc(member),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return member;
  }

  async update(orgId: string, id: string, patch: MemberPatch): Promise<void> {
    const partial: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (patch.firstName !== undefined) partial.firstName = patch.firstName.trim();
    if (patch.lastName !== undefined) partial.lastName = patch.lastName.trim();
    if (patch.firstName !== undefined || patch.lastName !== undefined) {
      const current = await this.getById(orgId, id);
      const first = patch.firstName?.trim() ?? current?.firstName ?? '';
      const last = patch.lastName?.trim() ?? current?.lastName ?? '';
      partial.searchName = normalizeSearch(`${first} ${last}`);
    }
    if (patch.phone !== undefined) partial.phone = patch.phone.trim() || null;
    if (patch.email !== undefined) partial.email = patch.email.trim() || null;
    if (patch.notes !== undefined) partial.notes = patch.notes.trim() || null;
    await updateDoc(doc(this.membersCol(orgId), id), partial);
  }
}
