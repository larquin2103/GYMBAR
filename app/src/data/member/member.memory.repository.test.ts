import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryMemberRepository } from './member.memory.repository';

const ORG = 'org-test';

describe('InMemoryMemberRepository', () => {
  let repo: InMemoryMemberRepository;

  beforeEach(() => {
    repo = new InMemoryMemberRepository();
  });

  it('crea y recupera un cliente por id', async () => {
    const created = await repo.create(ORG, { firstName: 'Ana', lastName: 'García' });
    const found = await repo.getById(ORG, created.id);
    expect(found?.firstName).toBe('Ana');
  });

  it('busca por prefijo de nombre normalizado', async () => {
    await repo.create(ORG, { firstName: 'Lucía', lastName: 'Fernández' });
    await repo.create(ORG, { firstName: 'Carlos', lastName: 'Ruiz' });
    const page = await repo.search(ORG, { search: 'luc' });
    expect(page.items).toHaveLength(1);
    expect(page.items[0]!.firstName).toBe('Lucía');
  });

  it('aísla datos por organización', async () => {
    await repo.create('orgA', { firstName: 'Ana', lastName: 'García' });
    const page = await repo.search('orgB', {});
    expect(page.items).toHaveLength(0);
  });

  it('pagina por cursor', async () => {
    for (let i = 0; i < 25; i++) {
      await repo.create(ORG, { firstName: `Cliente${String(i).padStart(2, '0')}`, lastName: 'X' });
    }
    const first = await repo.search(ORG, { limit: 20 });
    expect(first.items).toHaveLength(20);
    expect(first.nextCursor).not.toBeNull();
    const second = await repo.search(ORG, { limit: 20, cursor: first.nextCursor });
    expect(second.items).toHaveLength(5);
    expect(second.nextCursor).toBeNull();
  });

  it('actualiza y recomputa el nombre de búsqueda', async () => {
    const m = await repo.create(ORG, { firstName: 'Ana', lastName: 'García' });
    await repo.update(ORG, m.id, { firstName: 'Analía' });
    const found = await repo.getById(ORG, m.id);
    expect(found?.searchName).toBe('analia garcia');
  });
});
