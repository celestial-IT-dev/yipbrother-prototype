import { STATUSES, ROLES } from './constants';
import type { OrderStatus, Role } from './constants';
import type { OrderHistoryEntry } from './types';

interface TransitionRule {
  allowedNext: OrderStatus[];
  allowedRoles: Role[];
}

const S = STATUSES;
const R = ROLES;

export const WORKFLOW_RULES: Record<string, TransitionRule> = {
  [S.DRAFT]: {
    allowedNext: [S.PENDING_CUSTOMER_CONFIRMATION],
    allowedRoles: [R.SALES, R.ADMIN],
  },
  [S.PENDING_CUSTOMER_CONFIRMATION]: {
    allowedNext: [S.CUSTOMER_CONFIRMED, S.ON_HOLD],
    allowedRoles: [R.SALES, R.ADMIN],
  },
  [S.CUSTOMER_CONFIRMED]: {
    allowedNext: [S.PENDING_PAYMENT, S.ON_HOLD],
    allowedRoles: [R.SALES, R.ADMIN],
  },
  [S.PENDING_PAYMENT]: {
    allowedNext: [S.ORDER_RELEASED_TO_ENGINEERING, S.ON_HOLD],
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
    allowedRoles: [R.PRODUCTION_ENGINEER],
  },
  [S.FABRICATION_IN_PROGRESS]: {
    allowedNext: [S.ASSEMBLY_IN_PROGRESS, S.ON_HOLD],
    allowedRoles: [R.PRODUCTION_ENGINEER],
  },
  [S.ASSEMBLY_IN_PROGRESS]: {
    allowedNext: [S.PAINTING_IN_PROGRESS, S.ON_HOLD],
    allowedRoles: [R.PRODUCTION_ENGINEER],
  },
  [S.PAINTING_IN_PROGRESS]: {
    allowedNext: [S.INSTALLATION_IN_PROGRESS, S.ON_HOLD],
    allowedRoles: [R.PRODUCTION_ENGINEER],
  },
  [S.INSTALLATION_IN_PROGRESS]: {
    allowedNext: [S.QUALITY_INSPECTION, S.ON_HOLD],
    allowedRoles: [R.PRODUCTION_ENGINEER],
  },
  [S.QUALITY_INSPECTION]: {
    allowedNext: [S.READY_FOR_DELIVERY, S.REWORK_REQUIRED, S.ON_HOLD],
    allowedRoles: [R.QA_QC],
  },
  [S.REWORK_REQUIRED]: {
    allowedNext: [S.PRODUCTION_STARTED, S.ON_HOLD],
    allowedRoles: [R.QA_QC, R.PRODUCTION_ENGINEER],
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
    allowedNext: [S.CANCELLED], // Resume handled separately — picks previous status from history
    allowedRoles: [R.SALES, R.ADMIN, R.ENGINEER, R.DESIGNER, R.PRODUCTION_ENGINEER, R.QA_QC],
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

export function getPreviousStatusBeforeOnHold(history: OrderHistoryEntry[]): OrderStatus | null {
  // Find the last entry where it transitioned TO ON_HOLD
  let onHoldIndex = -1;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].new_status === STATUSES.ON_HOLD) {
      onHoldIndex = i;
      break;
    }
  }
  
  if (onHoldIndex === -1) return null;
  
  // The previous status is the one before the ON_HOLD transition
  if (onHoldIndex > 0) {
    return history[onHoldIndex - 1].new_status;
  }
  
  return null;
}

export function canUserSeeOrder(currentStatus: string, userRole: Role): boolean {
  // Sales and Admin can see all orders at all times
  if (userRole === R.SALES || userRole === R.ADMIN) return true;

  // Engineer can see orders from "Order Released to Engineering" onwards
  if (userRole === R.ENGINEER) {
    const engineeringStages: OrderStatus[] = [
      S.ORDER_RELEASED_TO_ENGINEERING,
      S.DESIGN_IN_PROGRESS,
      S.PENDING_DESIGN_APPROVAL,
      S.MATERIAL_PLANNING,
      S.WAITING_FOR_MATERIALS,
      S.MATERIALS_READY,
      S.PENDING_TO_START,
      S.ON_HOLD,
      S.REJECTED_REVISION_REQUESTED,
      // Production stages onwards are also visible
      S.PRODUCTION_STARTED,
      S.FABRICATION_IN_PROGRESS,
      S.ASSEMBLY_IN_PROGRESS,
      S.PAINTING_IN_PROGRESS,
      S.INSTALLATION_IN_PROGRESS,
      S.QUALITY_INSPECTION,
      S.READY_FOR_DELIVERY,
      S.INQUIRE_DELIVERY_METHOD,
      S.PENDING_FINAL_PAYMENT,
      S.SIGN_OFF,
      S.COMPLETED_CLOSED,
    ];
    return engineeringStages.includes(currentStatus as OrderStatus);
  }

  // Designer can see orders from "Order Released to Engineering" onwards (design stages)
  if (userRole === R.DESIGNER) {
    const designerStages: OrderStatus[] = [
      S.ORDER_RELEASED_TO_ENGINEERING,
      S.DESIGN_IN_PROGRESS,
      S.PENDING_DESIGN_APPROVAL,
      S.REJECTED_REVISION_REQUESTED,
      S.MATERIAL_PLANNING,
      S.WAITING_FOR_MATERIALS,
      S.MATERIALS_READY,
      S.PENDING_TO_START,
      S.ON_HOLD,
      // Production onwards
      S.PRODUCTION_STARTED,
      S.FABRICATION_IN_PROGRESS,
      S.ASSEMBLY_IN_PROGRESS,
      S.PAINTING_IN_PROGRESS,
      S.INSTALLATION_IN_PROGRESS,
      S.QUALITY_INSPECTION,
      S.READY_FOR_DELIVERY,
      S.INQUIRE_DELIVERY_METHOD,
      S.PENDING_FINAL_PAYMENT,
      S.SIGN_OFF,
      S.COMPLETED_CLOSED,
    ];
    return designerStages.includes(currentStatus as OrderStatus);
  }

  // Production Engineer can see orders from "Pending to Start" onwards
  if (userRole === R.PRODUCTION_ENGINEER) {
    const productionStages: OrderStatus[] = [
      S.PENDING_TO_START,
      S.PRODUCTION_STARTED,
      S.FABRICATION_IN_PROGRESS,
      S.ASSEMBLY_IN_PROGRESS,
      S.PAINTING_IN_PROGRESS,
      S.INSTALLATION_IN_PROGRESS,
      S.QUALITY_INSPECTION,
      S.REWORK_REQUIRED,
      S.READY_FOR_DELIVERY,
      S.INQUIRE_DELIVERY_METHOD,
      S.PENDING_FINAL_PAYMENT,
      S.SIGN_OFF,
      S.COMPLETED_CLOSED,
      S.ON_HOLD,
    ];
    return productionStages.includes(currentStatus as OrderStatus);
  }

  // QA/QC can see orders from "Quality Inspection" onwards
  if (userRole === R.QA_QC) {
    const qaqcStages: OrderStatus[] = [
      S.QUALITY_INSPECTION,
      S.REWORK_REQUIRED,
      S.READY_FOR_DELIVERY,
      S.INQUIRE_DELIVERY_METHOD,
      S.PENDING_FINAL_PAYMENT,
      S.SIGN_OFF,
      S.COMPLETED_CLOSED,
      S.ON_HOLD,
    ];
    return qaqcStages.includes(currentStatus as OrderStatus);
  }

  return false;
}

