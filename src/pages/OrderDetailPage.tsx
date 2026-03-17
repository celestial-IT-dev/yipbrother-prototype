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
      console.log('OrderDetailPage: No ID provided');
      return;
    }

    console.log('OrderDetailPage: Loading order with ID:', id);
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
        console.error('Order fetch error:', ordErr);
        throw ordErr;
      }
      
      if (histErr) {
        console.error('History fetch error:', histErr);
        // Don't throw, just log - history can be empty
      }
      
      console.log('Order fetched:', ord ? 'Found' : 'Not found');
      setOrder(ord as Order | null);
      setHistory((hist as OrderHistoryEntry[]) || []);
    })
    .catch((err) => {
      if (!active) return;
      console.error('Error loading order:', err);
      setError(`Failed to load order details: ${err.message}`);
      setOrder(null);
    })
    .finally(() => {
      if (active) {
        console.log('OrderDetailPage: Loading complete');
        setLoading(false);
      }
    });

    return () => { 
      active = false; 
      console.log('OrderDetailPage: Cleanup - component unmounted');
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
  const isOverdue = order.target_completion_date && !isTerminal && new Date(order.target_completion_date) < new Date();

  return (
    <div className="order-detail-page">
      {/* Header */}
      <div className="order-detail-header d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
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
            {isOverdue && <Badge bg="danger" className="pill-badge">⏰ Overdue</Badge>}
          </div>
          <div className="mt-2">
            <small className="text-muted">Customer: <strong>{order.customer_name}</strong></small>
            {order.profiles?.full_name && (
              <small className="text-muted ms-3">Sales: <strong>{order.profiles.full_name}</strong></small>
            )}
          </div>
        </div>
        <div className="d-flex gap-2 flex-wrap align-items-start">
          {!isTerminal && !LOCKED_FROM_EDIT_STATUSES.includes(order.current_status as any) && (
            <Link to={`/orders/${id}/edit`}>
              <Button variant="outline-secondary" size="sm" className="btn-modern">✏️ Edit</Button>
            </Link>
          )}
          {canUpdate && (
            <Button variant="primary" onClick={() => setShowModal(true)} className="btn-modern">
              🔄 Update Status
            </Button>
          )}
          {!canUpdate && !isTerminal && (
            <Button variant="outline-secondary" size="sm" disabled title="Your role cannot update this status" className="btn-modern">
              🔒 Status Update
            </Button>
          )}
        </div>
      </div>

      {successMsg && (
        <Alert variant="success" dismissible onClose={() => setSuccessMsg('')} className="alert-modern">
          ✅ {successMsg}
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
          <Nav.Item><Nav.Link eventKey="info">📋 Order Details</Nav.Link></Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="timeline">
              📅 History
              {history.length > 0 && (
                <Badge bg="secondary" className="ms-2" style={{ fontSize: '0.7rem' }}>{history.length}</Badge>
              )}
            </Nav.Link>
          </Nav.Item>
          <Nav.Item><Nav.Link eventKey="attachments">📎 Attachments</Nav.Link></Nav.Item>
          <Nav.Item><Nav.Link eventKey="milestones">🏁 Milestones</Nav.Link></Nav.Item>
          <Nav.Item><Nav.Link eventKey="workflow">📊 Workflow</Nav.Link></Nav.Item>
        </Nav>
        <Tab.Content>
          {/* Order Info Tab */}
          <Tab.Pane eventKey="info">
            <Row className="g-3">
              <Col md={6}>
                <Card className="info-card h-100">
                  <Card.Header className="info-card-header">👤 Customer Information</Card.Header>
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
                  <Card.Header className="info-card-header">🚛 Vehicle / Chassis</Card.Header>
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
                  <Card.Header className="info-card-header">🔧 Manufacturing</Card.Header>
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
                  <Card.Header className="info-card-header">📋 Order Details</Card.Header>
                  <Card.Body>
                    <Row>
                      <InfoRow label="Order Number" value={order.order_number} />
                      <InfoRow label="Salesperson" value={order.profiles?.full_name} />
                      <InfoRow
                        label="Target Completion"
                        value={order.target_completion_date
                          ? new Date(order.target_completion_date).toLocaleDateString()
                          : null}
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

          {/* Timeline Tab */}
          <Tab.Pane eventKey="timeline">
            <Card className="info-card">
              <Card.Body className="p-4">
                <StatusTimeline history={history} />
              </Card.Body>
            </Card>
          </Tab.Pane>

          {/* Attachments Tab */}
          <Tab.Pane eventKey="attachments">
            <Card className="info-card">
              <Card.Header className="info-card-header">📎 Attachments</Card.Header>
              <Card.Body className="p-4">
                <AttachmentsPanel orderId={id!} refreshTrigger={attachmentRefresh} />
              </Card.Body>
            </Card>
          </Tab.Pane>

          {/* Milestones Tab */}
          <Tab.Pane eventKey="milestones">
            <Card className="info-card">
              <Card.Header className="info-card-header">🏁 Milestone Dates</Card.Header>
              <Card.Body>
                <Row>
                  <InfoRow label="Order Created" value={order.created_at ? new Date(order.created_at).toLocaleDateString() : null} />
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

          {/* Workflow Tab */}
          <Tab.Pane eventKey="workflow">
            <Card className="info-card">
              <Card.Header className="info-card-header">📊 Order Workflow — Current Position</Card.Header>
              <Card.Body>
                <WorkflowDiagram currentStatus={order.current_status} />
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
