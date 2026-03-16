import { STATUSES, ROLES } from './constants';
import type { OrderStatus, Role } from './constants';

interface TransitionRule {
  allowedNext: OrderStatus[];
  allowedRoles: Role[];
}

const S = STATUSES;
const R = ROLES;

export const WORKFLOW_RULES: Record<string, TransitionRule> = {
  [S.DRAFT]: {
    allowedNext: [S.PENDING_CUSTOMER_CONFIRMATION, S.CANCELLED],
    allowedRoles: [R.SALES, R.ADMIN],
  },
  [S.PENDING_CUSTOMER_CONFIRMATION]: {
    allowedNext: [S.CUSTOMER_CONFIRMED, S.ON_HOLD, S.CANCELLED],
    allowedRoles: [R.SALES, R.ADMIN],
  },
  [S.CUSTOMER_CONFIRMED]: {
    allowedNext: [S.PENDING_PAYMENT, S.ON_HOLD, S.CANCELLED],
    allowedRoles: [R.SALES, R.ADMIN],
  },
  [S.PENDING_PAYMENT]: {
    allowedNext: [S.ORDER_RELEASED_TO_ENGINEERING, S.ON_HOLD, S.CANCELLED],
    allowedRoles: [R.SALES, R.ADMIN],
  },
  [S.ORDER_RELEASED_TO_ENGINEERING]: {
    allowedNext: [S.DESIGN_IN_PROGRESS, S.ON_HOLD],
    allowedRoles: [R.ENGINEER, R.DESIGNER],
  },
  [S.DESIGN_IN_PROGRESS]: {
    allowedNext: [S.PENDING_DESIGN_APPROVAL, S.ON_HOLD],
    allowedRoles: [R.ENGINEER, R.DESIGNER],
  },
  [S.PENDING_DESIGN_APPROVAL]: {
    allowedNext: [S.MATERIAL_PLANNING, S.REJECTED_REVISION_REQUESTED, S.ON_HOLD],
    allowedRoles: [R.ENGINEER, R.DESIGNER],
  },
  [S.REJECTED_REVISION_REQUESTED]: {
    allowedNext: [S.DESIGN_IN_PROGRESS],
    allowedRoles: [R.ENGINEER, R.DESIGNER],
  },
  [S.MATERIAL_PLANNING]: {
    allowedNext: [S.WAITING_FOR_MATERIALS, S.ON_HOLD],
    allowedRoles: [R.ENGINEER],
  },
  [S.WAITING_FOR_MATERIALS]: {
    allowedNext: [S.MATERIALS_READY, S.ON_HOLD],
    allowedRoles: [R.ENGINEER],
  },
  [S.MATERIALS_READY]: {
    allowedNext: [S.PENDING_TO_START, S.ON_HOLD],
    allowedRoles: [R.ENGINEER],
  },
  [S.PENDING_TO_START]: {
    allowedNext: [S.PRODUCTION_STARTED, S.ON_HOLD],
    allowedRoles: [R.ENGINEER],
  },
  [S.PRODUCTION_STARTED]: {
    allowedNext: [S.FABRICATION_IN_PROGRESS, S.ON_HOLD],
    allowedRoles: [R.ENGINEER],
  },
  [S.FABRICATION_IN_PROGRESS]: {
    allowedNext: [S.ASSEMBLY_IN_PROGRESS, S.ON_HOLD],
    allowedRoles: [R.ENGINEER],
  },
  [S.ASSEMBLY_IN_PROGRESS]: {
    allowedNext: [S.PAINTING_IN_PROGRESS, S.ON_HOLD],
    allowedRoles: [R.ENGINEER],
  },
  [S.PAINTING_IN_PROGRESS]: {
    allowedNext: [S.INSTALLATION_IN_PROGRESS, S.ON_HOLD],
    allowedRoles: [R.ENGINEER],
  },
  [S.INSTALLATION_IN_PROGRESS]: {
    allowedNext: [S.QUALITY_INSPECTION, S.ON_HOLD],
    allowedRoles: [R.ENGINEER],
  },
  [S.QUALITY_INSPECTION]: {
    allowedNext: [S.READY_FOR_DELIVERY, S.REWORK_REQUIRED, S.ON_HOLD],
    allowedRoles: [R.QA_QC],
  },
  [S.REWORK_REQUIRED]: {
    allowedNext: [S.PRODUCTION_STARTED, S.ON_HOLD],
    allowedRoles: [R.QA_QC],
  },
  [S.READY_FOR_DELIVERY]: {
    allowedNext: [S.INQUIRE_DELIVERY_METHOD],
    allowedRoles: [R.SALES, R.ADMIN],
  },
  [S.INQUIRE_DELIVERY_METHOD]: {
    allowedNext: [S.PENDING_FINAL_PAYMENT, S.ON_HOLD],
    allowedRoles: [R.SALES, R.ADMIN],
  },
  [S.PENDING_FINAL_PAYMENT]: {
    allowedNext: [S.SIGN_OFF, S.ON_HOLD],
    allowedRoles: [R.SALES, R.ADMIN],
  },
  [S.SIGN_OFF]: {
    allowedNext: [S.COMPLETED_CLOSED],
    allowedRoles: [R.SALES, R.ADMIN],
  },
  [S.ON_HOLD]: {
    allowedNext: [], // Resume handled separately — picks previous status from history
    allowedRoles: [R.SALES, R.ADMIN, R.ENGINEER, R.DESIGNER, R.QA_QC],
  },
  [S.COMPLETED_CLOSED]: { allowedNext: [], allowedRoles: [] },
  [S.CANCELLED]: { allowedNext: [], allowedRoles: [] },
};

export function getAllowedNextStatuses(currentStatus: string, userRole: Role): OrderStatus[] {
  const rule = WORKFLOW_RULES[currentStatus];
  if (!rule) return [];
  if (!rule.allowedRoles.includes(userRole)) return [];
  return rule.allowedNext;
}

export function canUserUpdateStatus(currentStatus: string, userRole: Role): boolean {
  const rule = WORKFLOW_RULES[currentStatus];
  if (!rule) return false;
  return rule.allowedRoles.includes(userRole);
}

