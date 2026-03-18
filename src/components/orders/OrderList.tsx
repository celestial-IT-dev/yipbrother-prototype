import React, { useState, useEffect } from 'react';
import { Form, Button, Badge, Spinner, Card, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/useAuth';
import { STATUSES, ROLES } from '../../lib/constants';
import type { OrderStatus } from '../../lib/constants';
import { canUserSeeOrder } from '../../lib/workflowRules';
import StatusBadge from './StatusBadge';

interface OrderListItem {
  id: string;
  order_number: string;
  customer_name: string;
  current_status: OrderStatus;
  body_type: string | null;
  target_completion_date: string | null;
  created_at: string;
  salesperson_id: string | null;
  profiles?: { full_name: string; email?: string } | null;
}

type SortField = 'created_at' | 'order_number' | 'customer_name' | 'body_type' | 'salesperson' | 'current_status' | 'target_completion_date';
type SortDirection = 'asc' | 'desc';

function buildQuery(statusFilter: string, userRole: string | undefined, userId: string | undefined) {
  let q = supabase
    .from('orders')
    .select('id, order_number, customer_name, current_status, body_type, target_completion_date, created_at, salesperson_id, profiles!salesperson_id(full_name, email)')
    .eq('is_archived', false)
    .order('created_at', { ascending: false });
  
  if (statusFilter) q = q.eq('current_status', statusFilter);
  
  // For sales users, only show their own orders
  if (userRole === ROLES.SALES && userId) {
    q = q.eq('salesperson_id', userId);
  }
  
  return q;
}

export default function OrderList() {
  const { profile, user } = useAuth();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [orderNumberFilter, setOrderNumberFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [salespersonFilter, setSalespersonFilter] = useState('');
  const [bodyTypeFilter, setBodyTypeFilter] = useState('');
  const [targetFrom, setTargetFrom] = useState('');
  const [targetTo, setTargetTo] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Initial load and re-load when statusFilter changes
  useEffect(() => {
    let active = true;
    
    buildQuery(statusFilter, profile?.role, user?.id).then(({ data, error }) => {
      if (!active) return;
      if (!error && data) setOrders(data as unknown as OrderListItem[]);
      setLoading(false);
    });

    return () => { active = false; };
  }, [statusFilter, profile?.role, user?.id]);

  const isOverdue = (order: OrderListItem) => {
    if (!order.target_completion_date) return false;
    if (([STATUSES.COMPLETED_CLOSED, STATUSES.CANCELLED] as string[]).includes(order.current_status)) return false;
    return new Date(order.target_completion_date) < new Date();
  };

  const filtered = orders.filter(o => {
    // Check role-based visibility
    if (profile && !canUserSeeOrder(o.current_status, profile.role)) {
      return false;
    }

    const orderNumber = o.order_number.toLowerCase();
    const customerName = o.customer_name.toLowerCase();
    const salespersonName = (o.profiles?.full_name || '').toLowerCase();
    const bodyType = (o.body_type || '').toLowerCase();

    if (orderNumberFilter && !orderNumber.includes(orderNumberFilter.toLowerCase())) {
      return false;
    }
    if (customerFilter && !customerName.includes(customerFilter.toLowerCase())) {
      return false;
    }
    if (salespersonFilter && !salespersonName.includes(salespersonFilter.toLowerCase())) {
      return false;
    }
    if (bodyTypeFilter && !bodyType.includes(bodyTypeFilter.toLowerCase())) {
      return false;
    }
    if (overdueOnly && !isOverdue(o)) {
      return false;
    }

    if (targetFrom || targetTo) {
      if (!o.target_completion_date) return false;
      const targetDate = new Date(o.target_completion_date);
      targetDate.setHours(0, 0, 0, 0);

      if (targetFrom) {
        const from = new Date(targetFrom);
        from.setHours(0, 0, 0, 0);
        if (targetDate < from) return false;
      }

      if (targetTo) {
        const to = new Date(targetTo);
        to.setHours(0, 0, 0, 0);
        if (targetDate > to) return false;
      }
    }

    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const mult = sortDirection === 'asc' ? 1 : -1;

    const getValue = (order: OrderListItem) => {
      switch (sortField) {
        case 'order_number':
          return order.order_number || '';
        case 'customer_name':
          return order.customer_name || '';
        case 'body_type':
          return order.body_type || '';
        case 'salesperson':
          return order.profiles?.full_name || '';
        case 'current_status':
          return order.current_status || '';
        case 'target_completion_date':
          return order.target_completion_date ? new Date(order.target_completion_date).getTime() : Number.MAX_SAFE_INTEGER;
        case 'created_at':
        default:
          return order.created_at ? new Date(order.created_at).getTime() : 0;
      }
    };

    const av = getValue(a);
    const bv = getValue(b);

    if (typeof av === 'number' && typeof bv === 'number') {
      return (av - bv) * mult;
    }

    return String(av).localeCompare(String(bv)) * mult;
  });

  const activeFilterCount = [
    statusFilter,
    orderNumberFilter,
    customerFilter,
    salespersonFilter,
    bodyTypeFilter,
    targetFrom,
    targetTo,
    overdueOnly ? 'overdue' : '',
  ].filter(Boolean).length;

  function resetFilters() {
    setStatusFilter('');
    setOrderNumberFilter('');
    setCustomerFilter('');
    setSalespersonFilter('');
    setBodyTypeFilter('');
    setTargetFrom('');
    setTargetTo('');
    setOverdueOnly(false);
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortField(field);
    setSortDirection(field === 'created_at' ? 'desc' : 'asc');
  }

  function applyPreset(preset: 'due_this_week' | 'overdue_production' | 'recent_new') {
    resetFilters();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (preset === 'due_this_week') {
      const in7Days = new Date(today);
      in7Days.setDate(in7Days.getDate() + 7);
      setTargetFrom(today.toISOString().split('T')[0]);
      setTargetTo(in7Days.toISOString().split('T')[0]);
      setSortField('target_completion_date');
      setSortDirection('asc');
      return;
    }

    if (preset === 'overdue_production') {
      setOverdueOnly(true);
      setStatusFilter(STATUSES.PRODUCTION_STARTED);
      setSortField('target_completion_date');
      setSortDirection('asc');
      return;
    }

    setSortField('created_at');
    setSortDirection('desc');
  }

  const sortArrow = (field: SortField) => {
    if (sortField !== field) return ' ↕';
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <div>
      <Card className="info-card mb-3 advanced-filter-card">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <div>
              <div className="advanced-filter-title">Advanced Filters</div>
              <div className="advanced-filter-subtitle">Search by specific columns and delivery timeline</div>
            </div>
            <div className="d-flex align-items-center gap-2">
              <Badge bg="secondary" className="pill-badge">{activeFilterCount} active</Badge>
              <Button variant="outline-secondary" size="sm" className="btn-modern" onClick={resetFilters}>
                Clear All
              </Button>
            </div>
          </div>

          <div className="d-flex flex-wrap gap-2 mb-3">
            <Button size="sm" variant="outline-primary" className="filter-preset-btn" onClick={() => applyPreset('due_this_week')}>
              Due This Week
            </Button>
            <Button size="sm" variant="outline-primary" className="filter-preset-btn" onClick={() => applyPreset('overdue_production')}>
              Overdue + Production
            </Button>
            <Button size="sm" variant="outline-primary" className="filter-preset-btn" onClick={() => applyPreset('recent_new')}>
              Recently Created
            </Button>
          </div>

          <Row className="g-2 g-md-3">
            <Col xs={12} md={6} lg={3}>
              <Form.Group>
                <Form.Label>Order Number</Form.Label>
                <Form.Control
                  placeholder="e.g. YB-202603-001"
                  value={orderNumberFilter}
                  onChange={e => setOrderNumberFilter(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <Form.Group>
                <Form.Label>Customer</Form.Label>
                <Form.Control
                  placeholder="Customer name"
                  value={customerFilter}
                  onChange={e => setCustomerFilter(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <Form.Group>
                <Form.Label>Salesperson</Form.Label>
                <Form.Control
                  placeholder="Salesperson name"
                  value={salespersonFilter}
                  onChange={e => setSalespersonFilter(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <Form.Group>
                <Form.Label>Status</Form.Label>
                <Form.Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="">All Statuses</option>
                  {Object.values(STATUSES).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col xs={12} md={6} lg={3}>
              <Form.Group>
                <Form.Label>Body Type</Form.Label>
                <Form.Control
                  placeholder="e.g. Flatbed"
                  value={bodyTypeFilter}
                  onChange={e => setBodyTypeFilter(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <Form.Group>
                <Form.Label>Target Date From</Form.Label>
                <Form.Control type="date" value={targetFrom} onChange={e => setTargetFrom(e.target.value)} />
              </Form.Group>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <Form.Group>
                <Form.Label>Target Date To</Form.Label>
                <Form.Control type="date" value={targetTo} onChange={e => setTargetTo(e.target.value)} />
              </Form.Group>
            </Col>
            <Col xs={12} md={6} lg={3} className="d-flex align-items-end">
              <Form.Check
                type="switch"
                id="overdue-only"
                label="Show overdue only"
                checked={overdueOnly}
                onChange={e => setOverdueOnly(e.target.checked)}
                className="mb-2"
              />
            </Col>
          </Row>

          <div className="mt-2 text-muted" style={{ fontSize: '0.8125rem' }}>
            Showing {sorted.length} order{sorted.length !== 1 ? 's' : ''}
          </div>
        </Card.Body>
      </Card>

      {/* Table */}
      <Card className="info-card overflow-hidden">
        {loading ? (
          <div className="spinner-center"><Spinner animation="border" variant="primary" /></div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2.5rem' }}>📭</div>
            <p className="mt-2 mb-0">No orders found</p>
          </div>
        ) : (
          <>
            <div className="d-md-none p-3">
              <div className="d-flex flex-column gap-3">
                {sorted.map(order => (
                  <Card key={order.id} className={`shadow-sm border-0 ${isOverdue(order) ? 'border-start border-4 border-danger' : ''}`}>
                    <Card.Body className="p-3">
                      <div className="d-flex justify-content-between align-items-start gap-2">
                        <div>
                          <Link
                            to={`/orders/${order.id}`}
                            className="fw-semibold text-decoration-none"
                            style={{ color: 'var(--primary)' }}
                          >
                            {order.order_number}
                          </Link>
                          <div className="mt-1 fw-semibold" style={{ fontSize: '0.9rem' }}>{order.customer_name}</div>
                        </div>
                        <StatusBadge status={order.current_status} size="sm" />
                      </div>

                      <div className="mt-2 d-flex flex-wrap gap-2 align-items-center">
                        {isOverdue(order) && <Badge bg="danger" className="pill-badge">Overdue</Badge>}
                        <Badge bg="light" text="dark">{order.body_type || 'No body type'}</Badge>
                      </div>

                      <div className="mt-3" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        <div>
                          <span className="fw-semibold">Target:</span>{' '}
                          {order.target_completion_date
                            ? new Date(order.target_completion_date).toLocaleDateString()
                            : '—'}
                        </div>
                        <div className="mt-1">
                          <span className="fw-semibold">Salesperson:</span>{' '}
                          {order.profiles?.full_name || '—'}
                        </div>
                      </div>

                      <div className="mt-3 d-flex justify-content-end">
                        <Link to={`/orders/${order.id}`}>
                          <Button size="sm" variant="outline-primary" className="btn-modern" style={{ padding: '0.25rem 0.75rem' }}>
                            View
                          </Button>
                        </Link>
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            </div>

            <div className="d-none d-md-block table-responsive">
              <table className="table orders-table mb-0">
                <thead>
                  <tr>
                    <th><button type="button" className="sort-header-btn" onClick={() => toggleSort('order_number')}>Order #{sortArrow('order_number')}</button></th>
                    <th><button type="button" className="sort-header-btn" onClick={() => toggleSort('customer_name')}>Customer{sortArrow('customer_name')}</button></th>
                    <th><button type="button" className="sort-header-btn" onClick={() => toggleSort('body_type')}>Body Type{sortArrow('body_type')}</button></th>
                    <th><button type="button" className="sort-header-btn" onClick={() => toggleSort('salesperson')}>Salesperson{sortArrow('salesperson')}</button></th>
                    <th><button type="button" className="sort-header-btn" onClick={() => toggleSort('current_status')}>Status{sortArrow('current_status')}</button></th>
                    <th><button type="button" className="sort-header-btn" onClick={() => toggleSort('target_completion_date')}>Target Date{sortArrow('target_completion_date')}</button></th>
                    <th style={{ width: 80 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(order => (
                    <tr key={order.id} className={isOverdue(order) ? 'overdue-row' : ''}>
                      <td>
                        <Link
                          to={`/orders/${order.id}`}
                          className="fw-semibold text-decoration-none"
                          style={{ color: 'var(--primary)' }}
                        >
                          {order.order_number}
                        </Link>
                        {isOverdue(order) && (
                          <Badge bg="danger" className="ms-2 pill-badge">Overdue</Badge>
                        )}
                      </td>
                      <td>
                        <div className="fw-semibold" style={{ fontSize: '0.875rem' }}>{order.customer_name}</div>
                      </td>
                      <td>
                        <span style={{ color: 'var(--text-secondary)' }}>{order.body_type || '—'}</span>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.875rem' }}>
                          <div className="fw-semibold">{order.profiles?.full_name || '—'}</div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{order.profiles?.email || '—'}</div>
                        </div>
                      </td>
                      <td><StatusBadge status={order.current_status} size="sm" /></td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {order.target_completion_date
                          ? new Date(order.target_completion_date).toLocaleDateString()
                          : '—'}
                      </td>
                      <td>
                        <Link to={`/orders/${order.id}`}>
                          <Button size="sm" variant="outline-primary" className="btn-modern" style={{ padding: '0.25rem 0.75rem' }}>
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
