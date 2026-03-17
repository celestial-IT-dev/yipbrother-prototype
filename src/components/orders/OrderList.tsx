import React, { useState, useEffect } from 'react';
import { Form, InputGroup, Button, Badge, Spinner, Card } from 'react-bootstrap';
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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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

  // Called directly from event handlers (not from an effect)
  async function applyFilter(nextFilter: string) {
    setLoading(true);
    const { data, error } = await buildQuery(nextFilter, profile?.role, user?.id);
    if (!error && data) setOrders(data as unknown as OrderListItem[]);
    setLoading(false);
  }

  const filtered = orders.filter(o => {
    // Check role-based visibility
    if (profile && !canUserSeeOrder(o.current_status, profile.role)) {
      return false;
    }

    // Check search filters
    const salespersonName = o.profiles?.full_name || '';
    return (
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      salespersonName.toLowerCase().includes(search.toLowerCase())
    );
  });

  const isOverdue = (order: OrderListItem) => {
    if (!order.target_completion_date) return false;
    if (([STATUSES.COMPLETED_CLOSED, STATUSES.CANCELLED] as string[]).includes(order.current_status)) return false;
    return new Date(order.target_completion_date) < new Date();
  };

  return (
    <div>
      {/* Filters */}
      <div className="d-flex flex-wrap gap-2 mb-3">
        <InputGroup style={{ maxWidth: 300 }} className="search-bar">
          <InputGroup.Text>🔍</InputGroup.Text>
          <Form.Control
            placeholder="Search order, customer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </InputGroup>
        <Form.Select
          style={{ maxWidth: 240, fontSize: '0.875rem' }}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          {Object.values(STATUSES).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Form.Select>
        <Button
          variant="outline-secondary"
          size="sm"
          className="btn-modern"
          onClick={() => {
            setSearch('');
            setStatusFilter('');
            void applyFilter('');
          }}
        >
          Reset
        </Button>
        <div className="ms-auto">
          <small className="text-muted">{filtered.length} order{filtered.length !== 1 ? 's' : ''}</small>
        </div>
      </div>

      {/* Table */}
      <Card className="info-card overflow-hidden">
        {loading ? (
          <div className="spinner-center"><Spinner animation="border" variant="primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2.5rem' }}>📭</div>
            <p className="mt-2 mb-0">No orders found</p>
          </div>
        ) : (
          <>
            <div className="d-md-none p-3">
              <div className="d-flex flex-column gap-3">
                {filtered.map(order => (
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
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Body Type</th>
                    <th>Salesperson</th>
                    <th>Status</th>
                    <th>Target Date</th>
                    <th style={{ width: 80 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(order => (
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
