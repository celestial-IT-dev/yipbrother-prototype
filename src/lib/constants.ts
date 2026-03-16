export const ROLES = {
  SALES: 'sales',
  ADMIN: 'admin',
  ENGINEER: 'engineer',
  DESIGNER: 'designer',
  QA_QC: 'qa_qc',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  sales: 'Sales',
  admin: 'Admin',
  engineer: 'Engineer',
  designer: 'Designer',
  qa_qc: 'QA/QC Engineer',
};

export const STATUSES = {
  DRAFT: 'Draft',
  PENDING_CUSTOMER_CONFIRMATION: 'Pending Customer Confirmation',
  CUSTOMER_CONFIRMED: 'Customer Confirmed',
  PENDING_PAYMENT: 'Pending Payment',
  ORDER_RELEASED_TO_ENGINEERING: 'Order Released to Engineering',
  DESIGN_IN_PROGRESS: 'Design in Progress',
  PENDING_DESIGN_APPROVAL: 'Pending Design Approval',
  MATERIAL_PLANNING: 'Material Planning',
  WAITING_FOR_MATERIALS: 'Waiting for Materials',
  MATERIALS_READY: 'Materials Ready',
  PENDING_TO_START: 'Pending to Start',
  PRODUCTION_STARTED: 'Production Started',
  FABRICATION_IN_PROGRESS: 'Fabrication in Progress',
  ASSEMBLY_IN_PROGRESS: 'Assembly in Progress',
  PAINTING_IN_PROGRESS: 'Painting in Progress',
  INSTALLATION_IN_PROGRESS: 'Installation in Progress',
  QUALITY_INSPECTION: 'Quality Inspection',
  READY_FOR_DELIVERY: 'Ready for Delivery / Collection',
  INQUIRE_DELIVERY_METHOD: 'Inquire Delivery Method from Customer',
  PENDING_FINAL_PAYMENT: 'Pending Final Payment',
  SIGN_OFF: 'Sign Off',
  COMPLETED_CLOSED: 'Completed / Closed',
  // Exception statuses
  REJECTED_REVISION_REQUESTED: 'Rejected / Revision Requested',
  REWORK_REQUIRED: 'Rework Required',
  ON_HOLD: 'On Hold',
  CANCELLED: 'Cancelled',
} as const;

export type OrderStatus = typeof STATUSES[keyof typeof STATUSES];

// Statuses that require a mandatory remark
export const MANDATORY_REMARK_STATUSES: OrderStatus[] = [
  STATUSES.ON_HOLD,
  STATUSES.CANCELLED,
  STATUSES.REJECTED_REVISION_REQUESTED,
  STATUSES.REWORK_REQUIRED,
];

// Terminal statuses — no further transitions
export const TERMINAL_STATUSES: OrderStatus[] = [
  STATUSES.COMPLETED_CLOSED,
  STATUSES.CANCELLED,
];

// Color map for badges
export const STATUS_COLORS: Record<string, string> = {
  [STATUSES.DRAFT]: 'secondary',
  [STATUSES.PENDING_CUSTOMER_CONFIRMATION]: 'warning',
  [STATUSES.CUSTOMER_CONFIRMED]: 'info',
  [STATUSES.PENDING_PAYMENT]: 'warning',
  [STATUSES.ORDER_RELEASED_TO_ENGINEERING]: 'primary',
  [STATUSES.DESIGN_IN_PROGRESS]: 'primary',
  [STATUSES.PENDING_DESIGN_APPROVAL]: 'warning',
  [STATUSES.MATERIAL_PLANNING]: 'primary',
  [STATUSES.WAITING_FOR_MATERIALS]: 'warning',
  [STATUSES.MATERIALS_READY]: 'info',
  [STATUSES.PENDING_TO_START]: 'warning',
  [STATUSES.PRODUCTION_STARTED]: 'primary',
  [STATUSES.FABRICATION_IN_PROGRESS]: 'primary',
  [STATUSES.ASSEMBLY_IN_PROGRESS]: 'primary',
  [STATUSES.PAINTING_IN_PROGRESS]: 'primary',
  [STATUSES.INSTALLATION_IN_PROGRESS]: 'primary',
  [STATUSES.QUALITY_INSPECTION]: 'info',
  [STATUSES.READY_FOR_DELIVERY]: 'success',
  [STATUSES.INQUIRE_DELIVERY_METHOD]: 'warning',
  [STATUSES.PENDING_FINAL_PAYMENT]: 'warning',
  [STATUSES.SIGN_OFF]: 'info',
  [STATUSES.COMPLETED_CLOSED]: 'success',
  [STATUSES.REJECTED_REVISION_REQUESTED]: 'danger',
  [STATUSES.REWORK_REQUIRED]: 'danger',
  [STATUSES.ON_HOLD]: 'dark',
  [STATUSES.CANCELLED]: 'danger',
};

