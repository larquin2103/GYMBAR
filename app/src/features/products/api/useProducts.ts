import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PaymentMethod } from '@gymbar/shared';
import type { ProductInput, StockMovementType } from '@/domain/product/product.entity';
import { getOperationalData } from '@/data/operational.factory';
import { useSession } from '@/shared/session/SessionContext';

export function useProducts() {
  const { organizationId } = useSession();
  const { products } = getOperationalData();
  return useQuery({
    queryKey: ['products', organizationId],
    queryFn: () => products.list(organizationId),
  });
}

export function useInventoryMovements(max = 100) {
  const { organizationId } = useSession();
  const { inventory } = getOperationalData();
  return useQuery({
    queryKey: ['stock-movements', organizationId, max],
    queryFn: () => inventory.listMovements(organizationId, max),
  });
}

export function useRecentSales(max = 50) {
  const { organizationId } = useSession();
  const { inventory } = getOperationalData();
  return useQuery({
    queryKey: ['sales', organizationId, max],
    queryFn: () => inventory.listRecentSales(organizationId, max),
  });
}

function useInvalidateInventory() {
  const { organizationId } = useSession();
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['products', organizationId] });
    qc.invalidateQueries({ queryKey: ['stock-movements', organizationId] });
    qc.invalidateQueries({ queryKey: ['sales', organizationId] });
    qc.invalidateQueries({ queryKey: ['cashbox', organizationId] });
  };
}

export function useCreateProduct() {
  const { organizationId } = useSession();
  const { products } = getOperationalData();
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: (input: ProductInput) => products.create(organizationId, input),
    onSuccess: invalidate,
  });
}

export function useUpdateProduct() {
  const { organizationId } = useSession();
  const { products } = getOperationalData();
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ProductInput> }) =>
      products.update(organizationId, id, input),
    onSuccess: invalidate,
  });
}

export function useAdjustStock() {
  const { organizationId, uid } = useSession();
  const { inventory } = getOperationalData();
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: (input: {
      productId: string;
      delta: number;
      type: StockMovementType;
      reason: string;
    }) => inventory.adjustStock(organizationId, { ...input, staffUid: uid }),
    onSuccess: invalidate,
  });
}

export function useRegisterSale() {
  const { organizationId } = useSession();
  const { operations } = getOperationalData();
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: (input: {
      items: { productId: string; quantity: number }[];
      method: PaymentMethod;
      memberId?: string | null;
      memberNameSnapshot?: string | null;
    }) =>
      operations.registerSale({
        orgId: organizationId,
        clientRequestId: crypto.randomUUID(),
        ...input,
      }),
    onSuccess: invalidate,
  });
}
