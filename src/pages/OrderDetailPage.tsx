import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Card, Row, Col, Tab, Nav, Button, Spinner, Alert, Badge
} from 'react-bootstrap';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/useAuth';
import { STATUSES, TERMINAL_STATUSES, LOCKED_FROM_EDIT_STATUSES } from '../lib/constants';
import type { OrderStatus } from '../lib/constants';
import type { Order, OrderHistoryEntry } from '../lib/types';
import { getAllowedNextStatuses, canUserUpdateStatus } from '../lib/workflowRules';
import StatusBadge from '../components/orders/StatusBadge';
import StatusTimeline from '../components/orders/StatusTimeline';
import StatusUpdateModal from '../components/orders/StatusUpdateModal';
import WorkflowDiagram from '../components/workflow/WorkflowDiagram';
import AttachmentsPanel from '../components/orders/AttachmentsPanel';

interface OrderUpdateData {
  current_status: OrderStatus;
  updated_at: string;
  customer_confirmation_date?: string;
  engineering_release_date?: string;
  materials_ready_date?: string;
  production_start_date?: string;
  inspection_date?: string;
  sign_off_date?: string;
  actual_completion_date?: string;
}

const WORKFLOW_SEQUENCE: OrderStatus[] = [
  STATUSES.DRAFT,
  STATUSES.PENDING_CUSTOMER_CONFIRMATION,
  STATUSES.CUSTOMER_CONFIRMED,
  STATUSES.PENDING_PAYMENT,
  STATUSES.ORDER_RELEASED_TO_ENGINEERING,
  STATUSES.DESIGN_IN_PROGRESS,
  STATUSES.PENDING_DESIGN_APPROVAL,
  STATUSES.MATERIAL_PLANNING,
  STATUSES.WAITING_FOR_MATERIALS,
  STATUSES.MATERIALS_READY,
  STATUSES.PENDING_TO_START,
  STATUSES.PRODUCTION_STARTED,
  STATUSES.FABRICATION_IN_PROGRESS,
  STATUSES.ASSEMBLY_IN_PROGRESS,
  STATUSES.PAINTING_IN_PROGRESS,
  STATUSES.INSTALLATION_IN_PROGRESS,
  STATUSES.QUALITY_INSPECTION,
  STATUSES.READY_FOR_DELIVERY,
  STATUSES.INQUIRE_DELIVERY_METHOD,
  STATUSES.PENDING_FINAL_PAYMENT,
  STATUSES.SIGN_OFF,
  STATUSES.COMPLETED_CLOSED,
];

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString() : '—';
}

function dateDiffInDays(from: Date, to: Date) {
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.ceil((to.getTime() - from.getTime()) / dayMs);
}

function getStatusAtDate(history: OrderHistoryEntry[], currentStatus: OrderStatus, cutoff: Date): OrderStatus {
  let statusAtCutoff = currentStatus;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const entry = history[i];
    if (new Date(entry.created_at) > cutoff) {
      if (entry.previous_status) {
        statusAtCutoff = entry.previous_status as OrderStatus;
      }
      continue;
    }
    break;
  }
  return statusAtCutoff;
}

function trendArrow(delta: number) {
  if (delta > 0) return 'UP';
  if (delta < 0) return 'DOWN';
  return 'FLAT';
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Col xs={12} sm={6} md={4} className="mb-3">
      <small className="text-muted d-block mb-1">{label}</small>
      <span className="fw-semibold">{value || '—'}</span>
    </Col>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [history, setHistory] = useState<OrderHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [attachmentRefresh, setAttachmentRefresh] = useState(0);

  // Separate non-effect loader used by handleStatusUpdate
  async function loadOrder() {
    if (!id) return;
    const [{ data: ord }, { data: hist }] = await Promise.all([
      supabase.from('orders').select('*, profiles(full_name, role)').eq('id', id).single(),
      supabase.from('order_status_history')
        .select('*, profiles(full_name, role)')
        .eq('order_id', id)
        .order('created_at', { ascending: true }),
    ]);
    setOrder((ord as Order | null) ?? null);
    setHistory((hist as OrderHistoryEntry[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    if (!id) {
      return;
    }

    let active = true;

    Promise.all([
      supabase.from('orders').select('*, profiles(full_name, role)').eq('id', id).single(),
      supabase.from('order_status_history')
        .select('*, profiles(full_name, role)')
        .eq('order_id', id)
        .order('created_at', { ascending: true }),
    ])
    .then(async ([{ data: ord, error: ordErr }, { data: hist, error: histErr }]) => {
      if (!active) return;
      
      if (ordErr) {
        throw ordErr;
      }
      
      if (histErr) {
        // Don't throw, just log - history can be empty
      }
      
      setOrder(ord as Order | null);
      setHistory((hist as OrderHistoryEntry[]) || []);
    })
    .catch((err) => {
      if (!active) return;
      setError(`Failed to load order details: ${err.message}`);
      setOrder(null);
    })
    .finally(() => {
      if (active) {
        setLoading(false);
      }
    });

    return () => { 
      active = false; 
    };
  }, [id]);


  async function handleStatusUpdate(newStatus: OrderStatus, remark: string) {
    if (!id || !order) {
      throw new Error('Order not found.');
    }

    const { error: err } = await supabase.from('order_status_history').insert({
      order_id: id,
      previous_status: order.current_status,
      new_status: newStatus,
      changed_by: profile?.id,
      remark: remark || null,
    });
    if (err) throw err;

    const updateData: OrderUpdateData = {
      current_status: newStatus,
      updated_at: new Date().toISOString(),
    };

    const today = new Date().toISOString().split('T')[0];
    if (newStatus === STATUSES.CUSTOMER_CONFIRMED) updateData.customer_confirmation_date = today;
    if (newStatus === STATUSES.ORDER_RELEASED_TO_ENGINEERING) updateData.engineering_release_date = today;
    if (newStatus === STATUSES.MATERIALS_READY) updateData.materials_ready_date = today;
    if (newStatus === STATUSES.PRODUCTION_STARTED) updateData.production_start_date = today;
    if (newStatus === STATUSES.QUALITY_INSPECTION) updateData.inspection_date = today;
    if (newStatus === STATUSES.SIGN_OFF) updateData.sign_off_date = today;
    if (newStatus === STATUSES.COMPLETED_CLOSED) updateData.actual_completion_date = today;

    const { error: updateErr } = await supabase.from('orders').update(updateData).eq('id', id);
    if (updateErr) throw updateErr;

    setSuccessMsg(`Status updated to "${newStatus}" successfully.`);
    setTimeout(() => setSuccessMsg(''), 4000);
    await loadOrder();
    // Trigger attachments refresh
    setAttachmentRefresh(prev => prev + 1);
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (!order) {
    return <Alert variant="danger">Order not found.</Alert>;
  }

  const allowedNext = profile
    ? getAllowedNextStatuses(order.current_status, profile.role)
    : [];
  const canUpdate = profile
    ? canUserUpdateStatus(order.current_status, profile.role) && allowedNext.length > 0
    : false;
  const isTerminal = TERMINAL_STATUSES.includes(order.current_status);
  const isLockedForEdit = LOCKED_FROM_EDIT_STATUSES.includes(order.current_status as any);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const createdDate = order.created_at ? new Date(order.created_at) : null;
  const targetDate = order.target_completion_date ? new Date(order.target_completion_date) : null;
  const workflowIndex = WORKFLOW_SEQUENCE.indexOf(order.current_status);

  if (createdDate) createdDate.setHours(0, 0, 0, 0);
  if (targetDate) targetDate.setHours(0, 0, 0, 0);

  const isOverdue = !!targetDate && !isTerminal && targetDate < today;
  const daysOpen = createdDate ? Math.max(0, dateDiffInDays(createdDate, today)) : null;
  const daysToTarget = targetDate ? dateDiffInDays(today, targetDate) : null;
  const progressPct = workflowIndex >= 0
    ? Math.round(((workflowIndex + 1) / WORKFLOW_SEQUENCE.length) * 100)
    : 0;
  const timelineEvents = history.length;
  const latestHistory = history[history.length - 1];

  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const recentEvents = history.filter(item => new Date(item.created_at) >= weekAgo).length;
  const status7DaysAgo = getStatusAtDate(history, order.current_status, weekAgo);
  const workflowIndex7DaysAgo = WORKFLOW_SEQUENCE.indexOf(status7DaysAgo);
  const progressPct7DaysAgo = workflowIndex7DaysAgo >= 0
    ? Math.round(((workflowIndex7DaysAgo + 1) / WORKFLOW_SEQUENCE.length) * 100)
    : 0;
  const progressDelta7d = progressPct - progressPct7DaysAgo;
  const daysOpenDelta7d = daysOpen !== null ? Math.min(daysOpen, 7) : 0;
  const daysToTargetDelta7d = daysToTarget !== null ? -7 : 0;

  const slaText = isOverdue
    ? 'At Risk'
    : daysToTarget === null
      ? 'No Target Date'
      : daysToTarget <= 3
        ? 'Due Soon'
        : 'On Track';

  const nextActionText = canUpdate && allowedNext.length > 0
    ? `Suggested next status: ${allowedNext[0]}`
    : isTerminal
      ? 'Order is in terminal status.'
      : 'No status update permission for current role.';

  return (
    <div className="order-detail-page">
      <Card className="order-hero-card mb-3">
        <Card.Body className="p-3 p-md-4">
          <div className="order-detail-header d-flex flex-wrap justify-content-between align-items-start gap-3">
            <div>
              <nav aria-label="breadcrumb">
                <ol className="breadcrumb mb-1">
                  <li className="breadcrumb-item"><Link to="/orders" className="text-decoration-none">Orders</Link></li>
                  <li className="breadcrumb-item active fw-semibold">{order.order_number}</li>
                </ol>
              </nav>
              <h3 className="fw-bold mb-2">{order.order_number}</h3>
              <div className="d-flex flex-wrap align-items-center gap-2">
                <StatusBadge status={order.current_status} />
                <Badge bg={isOverdue ? 'danger' : 'success'} className="pill-badge">{slaText}</Badge>
                {isOverdue && <Badge bg="danger" className="pill-badge">Overdue</Badge>}
              </div>
              <div className="mt-2">
                <small className="text-muted">Customer: <strong>{order.customer_name}</strong></small>
                {order.profiles?.full_name && (
                  <small className="text-muted ms-3">Sales: <strong>{order.profiles.full_name}</strong></small>
                )}
              </div>
            </div>
            <div className="d-flex gap-2 flex-wrap align-items-start">
              {!isTerminal && !isLockedForEdit && (
                <Link to={`/orders/${id}/edit`}>
                  <Button variant="outline-secondary" size="sm" className="btn-modern">Edit</Button>
                </Link>
              )}
              {canUpdate && (
                <Button variant="primary" onClick={() => setShowModal(true)} className="btn-modern">
                  Update Status
                </Button>
              )}
              {!canUpdate && !isTerminal && (
                <Button variant="outline-secondary" size="sm" disabled title="Your role cannot update this status" className="btn-modern">
                  Status Update Locked
                </Button>
              )}
            </div>
          </div>

          <Row className="g-2 g-md-3 mt-2">
            <Col xs={6} md={3}>
              <div className="order-mini-metric">
                <div className="metric-label">Days Open</div>
                <div className="metric-value">{daysOpen ?? '—'}</div>
                <div className="metric-trend">{trendArrow(daysOpenDelta7d)} {Math.abs(daysOpenDelta7d)}d vs 7d</div>
              </div>
            </Col>
            <Col xs={6} md={3}>
              <div className="order-mini-metric">
                <div className="metric-label">Days To Target</div>
                <div className={`metric-value ${isOverdue ? 'text-danger' : ''}`}>{daysToTarget ?? '—'}</div>
                <div className="metric-trend">{trendArrow(daysToTargetDelta7d)} {Math.abs(daysToTargetDelta7d)}d vs 7d</div>
              </div>
            </Col>
            <Col xs={6} md={3}>
              <div className="order-mini-metric">
                <div className="metric-label">Workflow Progress</div>
                <div className="metric-value">{progressPct}%</div>
                <div className={`metric-trend ${progressDelta7d > 0 ? 'text-success' : progressDelta7d < 0 ? 'text-danger' : ''}`}>
                  {trendArrow(progressDelta7d)} {Math.abs(progressDelta7d)}% vs 7d
                </div>
              </div>
            </Col>
            <Col xs={6} md={3}>
              <div className="order-mini-metric">
                <div className="metric-label">Timeline Events</div>
                <div className="metric-value">{timelineEvents}</div>
                <div className="metric-trend">UP {recentEvents} this week</div>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="info-card mb-3">
        <Card.Header className="info-card-header">Admin Brief</Card.Header>
        <Card.Body>
          <Row className="g-3">
            <Col md={7}>
              <div className="insight-panel">
                <div className="insight-title">Immediate Focus</div>
                <div className="insight-text">{nextActionText}</div>
                <div className="insight-meta mt-2">
                  Last update: {latestHistory ? `${latestHistory.new_status} on ${formatDate(latestHistory.created_at)}` : 'No status history yet'}
                </div>
              </div>
            </Col>
            <Col md={5}>
              <div className="insight-panel h-100">
                <div className="insight-title">Schedule Health</div>
                <div className="insight-text">
                  {isOverdue
                    ? 'This order is overdue. Prioritize status movement and owner follow-up today.'
                    : daysToTarget !== null && daysToTarget <= 3
                      ? 'Due date is near. Confirm next stage readiness and dependencies.'
                      : 'Timeline appears stable for now. Keep milestone checks on cadence.'}
                </div>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {successMsg && (
        <Alert variant="success" dismissible onClose={() => setSuccessMsg('')} className="alert-modern">
          {successMsg}
        </Alert>
      )}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')} className="alert-modern">
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Tab.Container defaultActiveKey="info">
        <Nav variant="tabs" className="detail-tabs mb-3">
          <Nav.Item><Nav.Link eventKey="info">Order Details</Nav.Link></Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="journey">
              Journey
              {history.length > 0 && (
                <Badge bg="secondary" className="ms-2" style={{ fontSize: '0.7rem' }}>{history.length}</Badge>
              )}
            </Nav.Link>
          </Nav.Item>
          <Nav.Item><Nav.Link eventKey="attachments">Attachments</Nav.Link></Nav.Item>
          <Nav.Item><Nav.Link eventKey="milestones">Milestones</Nav.Link></Nav.Item>
        </Nav>
        <Tab.Content>
          {/* Order Info Tab */}
          <Tab.Pane eventKey="info">
            <Row className="g-3">
              <Col md={6}>
                <Card className="info-card h-100">
                  <Card.Header className="info-card-header">Customer Information</Card.Header>
                  <Card.Body>
                    <Row>
                      <InfoRow label="Customer Name" value={order.customer_name} />
                      <InfoRow label="Company" value={order.company_name} />
                      <InfoRow label="Contact Person" value={order.contact_person} />
                      <InfoRow label="Phone" value={order.phone} />
                      <InfoRow label="Email" value={order.email} />
                    </Row>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6}>
                <Card className="info-card h-100">
                  <Card.Header className="info-card-header">Vehicle / Chassis</Card.Header>
                  <Card.Body>
                    <Row>
                      <InfoRow label="Vehicle Reg." value={order.vehicle_reg} />
                      <InfoRow label="Chassis No." value={order.chassis_number} />
                      <InfoRow label="Vehicle Model" value={order.vehicle_model} />
                      <InfoRow label="Vehicle Type" value={order.vehicle_type} />
                    </Row>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6}>
                <Card className="info-card h-100">
                  <Card.Header className="info-card-header">Manufacturing</Card.Header>
                  <Card.Body>
                    <Row>
                      <InfoRow label="Body Type" value={order.body_type} />
                      <InfoRow label="Dimensions" value={order.dimensions} />
                      <InfoRow label="Special Requirements" value={order.special_requirements} />
                      <InfoRow label="Production Notes" value={order.production_notes} />
                    </Row>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6}>
                <Card className="info-card h-100">
                  <Card.Header className="info-card-header">Order Details</Card.Header>
                  <Card.Body>
                    <Row>
                      <InfoRow label="Order Number" value={order.order_number} />
                      <InfoRow label="Salesperson" value={order.profiles?.full_name} />
                      <InfoRow
                        label="Target Completion"
                        value={formatDate(order.target_completion_date)}
                      />
                      {/* <InfoRow label="Initial Payment" value={order.initial_payment_status} />
                      <InfoRow label="Final Payment" value={order.final_payment_status} /> 
                      <InfoRow label="Invoice Ref." value={order.invoice_reference} />*/}
                      <InfoRow label="Payment Remarks" value={order.payment_remarks} />
                      {/* <InfoRow label="Delivery Method" value={order.delivery_method} />
                      <InfoRow label="Delivery Remarks" value={order.delivery_remarks} /> */}
                    </Row>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab.Pane>

          {/* Journey Tab */}
          <Tab.Pane eventKey="journey">
            <Row className="g-3">
              <Col lg={5}>
                <Card className="info-card h-100">
                  <Card.Header className="info-card-header">Current Workflow Position</Card.Header>
                  <Card.Body>
                    <WorkflowDiagram currentStatus={order.current_status} />
                    <div className="journey-note mt-3">
                      <strong>7-day movement:</strong> {status7DaysAgo} {'->'} {order.current_status}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col lg={7}>
                <Card className="info-card h-100">
                  <Card.Header className="info-card-header">Status History Timeline</Card.Header>
                  <Card.Body className="p-4">
                    <StatusTimeline history={history} />
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab.Pane>

          {/* Attachments Tab */}
          <Tab.Pane eventKey="attachments">
            <Card className="info-card">
              <Card.Header className="info-card-header">Attachments</Card.Header>
              <Card.Body className="p-4">
                <AttachmentsPanel orderId={id!} refreshTrigger={attachmentRefresh} />
              </Card.Body>
            </Card>
          </Tab.Pane>

          {/* Milestones Tab */}
          <Tab.Pane eventKey="milestones">
            <Card className="info-card">
              <Card.Header className="info-card-header">Milestone Dates</Card.Header>
              <Card.Body>
                <Row>
                  <InfoRow label="Order Created" value={formatDate(order.created_at)} />
                  <InfoRow label="Customer Confirmed" value={order.customer_confirmation_date} />
                  <InfoRow label="Engineering Released" value={order.engineering_release_date} />
                  <InfoRow label="Materials Ready" value={order.materials_ready_date} />
                  <InfoRow label="Production Started" value={order.production_start_date} />
                  <InfoRow label="Inspection Date" value={order.inspection_date} />
                  <InfoRow label="Sign Off Date" value={order.sign_off_date} />
                  <InfoRow label="Target Completion" value={order.target_completion_date} />
                  <InfoRow label="Estimated Completion" value={order.estimated_completion_date} />
                  <InfoRow label="Actual Completion" value={order.actual_completion_date} />
                </Row>
              </Card.Body>
            </Card>
          </Tab.Pane>

        </Tab.Content>
      </Tab.Container>

      <StatusUpdateModal
        show={showModal}
        orderId={id!}
        currentStatus={order.current_status}
        allowedNextStatuses={allowedNext}
        history={history}
        onConfirm={handleStatusUpdate}
        onHide={() => setShowModal(false)}
      />
    </div>
  );
}
