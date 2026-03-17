import React from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import SummaryCards from '../components/dashboard/SummaryCards';
import StatusBreakdownTable from '../components/dashboard/StatusBreakdownTable';
import { useAuth } from '../context/useAuth';
import { ROLE_LABELS, ROLES } from '../lib/constants';

export default function DashboardPage() {
  const { profile } = useAuth();

  return (
    <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
      {/* Page header */}
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">
            Welcome back, <strong>{profile?.full_name}</strong>
            {profile && (
              <span
                className="ms-2"
                style={{
                  display: 'inline-block',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  padding: '0.15rem 0.5rem',
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  borderRadius: '100px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {ROLE_LABELS[profile.role]}
              </span>
            )}
          </div>
        </div>
        {(profile?.role === ROLES.SALES || profile?.role === ROLES.ADMIN) && (
          <Link to="/orders/new" className="btn btn-primary btn-modern">
            + New Order
          </Link>
        )}
      </div>

      <SummaryCards />

      <Row className="g-3">
        <Col lg={7}>
          <Card className="info-card h-100">
            <Card.Header className="info-card-header">Orders by Status</Card.Header>
            <Card.Body>
              <StatusBreakdownTable />
            </Card.Body>
          </Card>
        </Col>
        <Col lg={5}>
          <Card className="info-card h-100">
            <Card.Header className="info-card-header">Quick Reference</Card.Header>
            <Card.Body>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {/*
                  List of order status with icons and descriptions
                */}
                {/*
                  - Draft: Order saved, not yet in workflow
                  - Active: Orders currently in progress
                  - Overdue: Past target completion date
                  - On Hold: Temporarily paused
                  - Completed: Fully closed orders
                  - Cancelled: Orders cancelled before completion
                */}
                {['Draft', 'Active', 'Overdue', 'On Hold', 'Completed', 'Cancelled'].map((status, idx) => (
                  <div key={status} className="d-flex align-items-start gap-2">
                    <span style={{ fontSize: '1rem', lineHeight: 1.4 }}>{['', '', '', '', '', ''][idx]}</span>
                    <span style={{ fontSize: '0.875rem' }}>
                      <strong>{status}</strong>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {' '}
                        — {['Order saved, not yet in workflow', 'Orders currently in progress', 'Past target completion date', 'Temporarily paused', 'Fully closed orders', 'Orders cancelled before completion'][idx]}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
              <div
                className="mt-3 p-3 rounded"
                style={{ background: 'var(--surface-3)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}
              >
                Only authorized roles can update statuses. A reason is required for On Hold, Cancel, or Revision requests.
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
