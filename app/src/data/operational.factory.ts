import { isFirebaseConfigured, getDb, getFunctionsInstance } from '@/shared/lib/firebase';
import type { PlanRepository } from '@/domain/plan/plan.entity';
import type { MembershipRepository } from '@/domain/membership/membership.entity';
import type { PaymentRepository } from '@/domain/payment/payment.entity';
import type { CheckInRepository } from '@/domain/checkin/checkin.entity';
import type { CashboxRepository } from '@/domain/cashbox/cashbox.entity';
import type { StatsRepository } from '@/domain/stats/stats';
import type { MeasurementRepository } from '@/domain/measurement/measurement.entity';
import type { OperationsService } from '@/domain/operations/operations.service';
import {
  demoPlanRepo,
  demoMembershipRepo,
  demoPaymentRepo,
  demoCheckInRepo,
  demoCashboxRepo,
  demoStatsRepo,
  demoMeasurementRepo,
} from './demo/demoRepositories';
import { demoOperations } from './demo/demoOperations';
import {
  FirestorePlanRepository,
  FirestoreMembershipRepository,
  FirestorePaymentRepository,
  FirestoreCheckInRepository,
  FirestoreCashboxRepository,
  FirestoreStatsRepository,
  FirestoreMeasurementRepository,
} from './firestore/firestoreRepositories';
import { FirebaseOperationsService } from './firestore/firebaseOperations';

/**
 * Selector único para los servicios/repos operativos. En producción usa
 * Firestore (lectura) + Cloud Functions callables (operaciones sensibles); en
 * dev/demo usa las implementaciones en memoria coherentes. La UI depende solo
 * de las interfaces de dominio.
 */
interface OperationalData {
  plans: PlanRepository;
  memberships: MembershipRepository;
  payments: PaymentRepository;
  checkins: CheckInRepository;
  cashbox: CashboxRepository;
  stats: StatsRepository;
  measurements: MeasurementRepository;
  operations: OperationsService;
}

let cached: OperationalData | null = null;

export function getOperationalData(): OperationalData {
  if (cached) return cached;
  if (isFirebaseConfigured) {
    const db = getDb();
    cached = {
      plans: new FirestorePlanRepository(db),
      memberships: new FirestoreMembershipRepository(db),
      payments: new FirestorePaymentRepository(db),
      checkins: new FirestoreCheckInRepository(db),
      cashbox: new FirestoreCashboxRepository(db),
      stats: new FirestoreStatsRepository(db),
      measurements: new FirestoreMeasurementRepository(db),
      operations: new FirebaseOperationsService(getFunctionsInstance()),
    };
  } else {
    cached = {
      plans: demoPlanRepo,
      memberships: demoMembershipRepo,
      payments: demoPaymentRepo,
      checkins: demoCheckInRepo,
      cashbox: demoCashboxRepo,
      stats: demoStatsRepo,
      measurements: demoMeasurementRepo,
      operations: demoOperations,
    };
  }
  return cached;
}
