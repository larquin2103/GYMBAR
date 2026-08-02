import type { PaymentMethod } from '@gymbar/shared';

/** Producto del catálogo / punto de venta (docs/03). Precio en centavos. */
export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  /** Precio de venta al público (centavos). */
  priceCents: number;
  /** Costo de adquisición (centavos), opcional, para margen. */
  costCents: number | null;
  currency: string;
  stock: number;
  /** Umbral de stock bajo para alertas. */
  lowStockThreshold: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductInput {
  name: string;
  sku: string;
  category: string;
  priceCents: number;
  costCents: number | null;
  currency: string;
  /** Stock inicial (solo se usa al crear). */
  stock: number;
  lowStockThreshold: number;
  isActive: boolean;
}

export type StockMovementType = 'restock' | 'sale' | 'adjustment';

/** Asiento del libro de inventario (cada cambio de stock deja rastro). */
export interface StockMovement {
  id: string;
  productId: string;
  productNameSnapshot: string;
  type: StockMovementType;
  /** Cambio con signo: +entrada, −salida. */
  quantityDelta: number;
  /** Stock resultante tras aplicar el movimiento. */
  stockAfter: number;
  reason: string;
  saleId: string | null;
  staffUid: string;
  createdAt: Date;
}

/** Línea de una venta (snapshot del producto y precio al momento). */
export interface SaleLine {
  productId: string;
  nameSnapshot: string;
  unitPriceCents: number;
  quantity: number;
  subtotalCents: number;
}

/** Venta de mostrador. Toca stock y caja; en prod la crea una Cloud Function. */
export interface Sale {
  id: string;
  items: SaleLine[];
  totalCents: number;
  currency: string;
  method: PaymentMethod;
  memberId: string | null;
  memberNameSnapshot: string | null;
  cashSessionId: string | null;
  staffUid: string;
  createdAt: Date;
}

/** ¿El producto está en o por debajo del umbral de stock bajo? */
export function isLowStock(p: Pick<Product, 'stock' | 'lowStockThreshold'>): boolean {
  return p.stock <= p.lowStockThreshold;
}

/** Margen unitario en centavos (o null si no hay costo). */
export function unitMarginCents(p: Pick<Product, 'priceCents' | 'costCents'>): number | null {
  return p.costCents == null ? null : p.priceCents - p.costCents;
}

export interface ProductRepository {
  list(orgId: string): Promise<Product[]>;
  getById(orgId: string, id: string): Promise<Product | null>;
  create(orgId: string, input: ProductInput): Promise<Product>;
  update(orgId: string, id: string, input: Partial<ProductInput>): Promise<void>;
}

export interface AdjustStockInput {
  productId: string;
  /** Cambio con signo aplicado al stock. */
  delta: number;
  type: StockMovementType;
  reason: string;
  staffUid: string;
}

export interface InventoryRepository {
  listMovements(orgId: string, max?: number): Promise<StockMovement[]>;
  /** Aplica un ajuste de stock (entrada/salida/corrección) y deja el asiento. */
  adjustStock(orgId: string, input: AdjustStockInput): Promise<void>;
  listRecentSales(orgId: string, max?: number): Promise<Sale[]>;
}
