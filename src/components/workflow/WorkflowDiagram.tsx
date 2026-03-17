import { useAuth } from '../../context/useAuth';
import { ROLE_LABELS } from '../../lib/constants';
import type { Role } from '../../lib/constants';
import { Badge, Card, Col, Row } from 'react-bootstrap';

const WORKFLOW_STAGES = [
  // --- Sales / Admin stages ---
  {
    status: 'Draft',
    role: 'sales' as Role,
    icon: '📝',
    desc: 'Order created and saved as draft',
  },
  {
    status: 'Pending Customer Confirmation',
    role: 'sales' as Role,
    icon: '📨',
    desc: 'Quotation sent; awaiting customer approval',
  },
  {
    status: 'Customer Confirmed',
    role: 'sales' as Role,
    icon: '✅',
    desc: 'Customer has approved the order',
  },
  {
    status: 'Pending Payment',
    role: 'sales' as Role,
    icon: '💳',
    desc: 'Awaiting initial deposit / payment',
  },
  // --- Engineering handoff ---
  {
    status: 'Order Released to Engineering',
    role: 'engineer' as Role,
    icon: '🔧',
    desc: 'Sales releases order to Engineering team',
    handoff: true,
  },
  {
    status: 'Design in Progress',
    role: 'designer' as Role,
    icon: '📐',
    desc: 'Designer working on body drawings',
  },
  {
    status: 'Pending Design Approval',
    role: 'designer' as Role,
    icon: '🔍',
    desc: 'Design submitted for internal approval',
  },
  {
    status: 'Material Planning',
    role: 'engineer' as Role,
    icon: '📦',
    desc: 'Engineer plans required materials',
  },
  {
    status: 'Waiting for Materials',
    role: 'engineer' as Role,
    icon: '⏳',
    desc: 'Procurement in progress',
  },
  {
    status: 'Materials Ready',
    role: 'engineer' as Role,
    icon: '✔️',
    desc: 'All materials received and ready',
  },
  {
    status: 'Pending to Start',
    role: 'production_engineer' as Role,
    icon: '🚦',
    desc: 'Waiting for production slot to open',
    handoff: true,
  },
  {
    status: 'Production Started',
    role: 'production_engineer' as Role,
    icon: '🏭',
    desc: 'Shop floor production begins',
  },
  {
    status: 'Fabrication in Progress',
    role: 'production_engineer' as Role,
    icon: '⚙️',
    desc: 'Metal fabrication underway',
  },
  {
    status: 'Assembly in Progress',
    role: 'production_engineer' as Role,
    icon: '🔩',
    desc: 'Components being assembled',
  },
  {
    status: 'Painting in Progress',
    role: 'production_engineer' as Role,
    icon: '🎨',
    desc: 'Painting and finishing work',
  },
  {
    status: 'Installation in Progress',
    role: 'production_engineer' as Role,
    icon: '🛠️',
    desc: 'Fitting body onto vehicle chassis',
  },
  // --- QA handoff ---
  {
    status: 'Quality Inspection',
    role: 'qa_qc' as Role,
    icon: '🔎',
    desc: 'QA/QC engineer conducts final inspection',
    handoff: true,
  },
  {
    status: 'Ready for Delivery / Collection',
    role: 'sales' as Role,
    icon: '🚚',
    desc: 'Passes inspection; ready to ship',
    handoff: true,
  },
  {
    status: 'Inquire Delivery Method from Customer',
    role: 'sales' as Role,
    icon: '📞',
    desc: 'Confirm delivery or self-collection with customer',
  },
  {
    status: 'Pending Final Payment',
    role: 'sales' as Role,
    icon: '💰',
    desc: 'Balance payment collection',
  },
  {
    status: 'Sign Off',
    role: 'sales' as Role,
    icon: '✍️',
    desc: 'Customer sign-off on completed order',
  },
  {
    status: 'Completed / Closed',
    role: 'sales' as Role,
    icon: '🏁',
    desc: 'Order fully completed and closed',
  },
];

const EXCEPTION_STAGES = [
  { status: 'On Hold', icon: '⏸️', color: 'dark', desc: 'Order paused (remark required). Can resume from previous stage.' },
  { status: 'Rejected / Revision Requested', icon: '↩️', color: 'warning', desc: 'Design rejected; loops back to Design in Progress.' },
  { status: 'Rework Required', icon: '🔁', color: 'warning', desc: 'Inspection failed; loops back to Production Started.' },
  { status: 'Cancelled', icon: '❌', color: 'danger', desc: 'Order cancelled (remark required). Terminal state.' },
];

const ROLE_COLORS: Record<string, string> = {
  sales: 'primary',
  admin: 'primary',
  engineer: 'success',
  designer: 'info',
  production_engineer: 'success',
  qa_qc: 'warning',
};

function RolePill({ role }: { role: Role }) {
  return (
    <Badge bg={ROLE_COLORS[role] || 'secondary'} style={{ fontSize: '0.7rem' }}>
      {ROLE_LABELS[role]}
    </Badge>
  );
}

interface Props {
  currentStatus?: string; // highlight the active step
}

export default function WorkflowDiagram({ currentStatus }: Props) {
  const { profile } = useAuth();

  return (
    <div>
      {/* Legend */}
      <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
        <small className="text-muted fw-semibold me-1">Role Legend:</small>
        {(Object.entries(ROLE_LABELS) as [Role, string][]).map(([role, label]) => (
          <Badge key={role} bg={ROLE_COLORS[role] || 'secondary'} style={{ fontSize: '0.75rem' }}>
            {label}
          </Badge>
        ))}
      </div>

      {/* Main flow */}
      <div className="position-relative">
        {WORKFLOW_STAGES.map((stage, idx) => {
          const isActive = currentStatus === stage.status;
          const isPast = currentStatus
            ? WORKFLOW_STAGES.findIndex(s => s.status === currentStatus) > idx
            : false;
          const isMyRole = profile?.role === stage.role ||
            (stage.role === 'engineer' && profile?.role === 'admin') ||
            (stage.role === 'production_engineer' && profile?.role === 'admin') ||
            (stage.role === 'sales' && profile?.role === 'admin');

          return (
            <div key={stage.status} className="d-flex align-items-start mb-0">
              {/* Connector line */}
              <div className="d-flex flex-column align-items-center me-3" style={{ minWidth: 32 }}>
                <div
                  className={`rounded-circle d-flex align-items-center justify-content-center border-2 border
                    ${isActive ? 'bg-primary text-white border-primary shadow' : isPast ? 'bg-success text-white border-success' : 'bg-white border-secondary'}`}
                  style={{ width: 32, height: 32, fontSize: '1rem', zIndex: 1, flexShrink: 0 }}
                  title={stage.status}
                >
                  {isPast ? '✓' : stage.icon}
                </div>
                {idx < WORKFLOW_STAGES.length - 1 && (
                  <div
                    style={{
                      width: 2,
                      height: stage.handoff ? 32 : 24,
                      background: isPast ? '#198754' : '#dee2e6',
                      margin: '0 auto',
                    }}
                  />
                )}
              </div>

              {/* Stage info */}
              <div
                className={`mb-1 py-2 px-3 rounded flex-grow-1
                  ${isActive ? 'bg-primary bg-opacity-10 border border-primary' : ''}
                  ${stage.handoff && !isActive ? 'border-start border-3 border-warning' : ''}`}
                style={{ marginBottom: stage.handoff ? 6 : 2 }}
              >
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <span className={`fw-semibold ${isActive ? 'text-primary' : isPast ? 'text-success' : ''}`}
                    style={{ fontSize: '0.9rem' }}>
                    {stage.status}
                  </span>
                  <RolePill role={stage.role} />
                  {isMyRole && <Badge bg="light" text="dark" style={{ fontSize: '0.65rem', border: '1px solid #dee2e6' }}>👤 You</Badge>}
                  {isActive && <Badge bg="primary" style={{ fontSize: '0.65rem' }}>◀ Current</Badge>}
                  {stage.handoff && <Badge bg="warning" text="dark" style={{ fontSize: '0.65rem' }}>Handoff</Badge>}
                </div>
                <div className="text-muted" style={{ fontSize: '0.78rem' }}>{stage.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Exception statuses */}
      <Card className="mt-4 border-danger border-opacity-25">
        <Card.Header className="bg-light fw-semibold text-dark">Exception / Special Statuses</Card.Header>
        <Card.Body>
          <Row className="g-2">
            {EXCEPTION_STAGES.map(e => (
              <Col xs={12} sm={6} key={e.status}>
                <div className={`p-2 rounded border border-${e.color} border-opacity-50 h-100`}>
                  <div className="fw-semibold" style={{ fontSize: '0.85rem' }}>
                    <Badge bg={e.color} className="me-1" style={{ fontSize: '0.7rem' }}>{e.status}</Badge>
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.78rem' }}>{e.desc}</div>
                </div>
              </Col>
            ))}
          </Row>
        </Card.Body>
      </Card>
    </div>
  );
}
