import React from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import SummaryCards from '../components/dashboard/SummaryCards';
import StatusBreakdownTable from '../components/dashboard/StatusBreakdownTable';
import OperationalInsights from '../components/dashboard/OperationalInsights';
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
            <Card.Header className="info-card-header">Operational Insights</Card.Header>
            <Card.Body>
              <OperationalInsights />
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
