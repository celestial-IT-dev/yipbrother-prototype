import React, { useEffect, useState } from 'react';
import { Row, Col, Spinner } from 'react-bootstrap';
import { supabase } from '../../lib/supabaseClient';
import { STATUSES, ROLE_VISIBLE_STATUSES, ROLES } from '../../lib/constants';
import { useAuth } from '../../context/useAuth';

interface Stats {
  total: number;
  active: number;
  onHold: number;
  completed: number;
  cancelled: number;
  overdue: number;
}

const CARD_CONFIG = [
  { key: 'active',     label: 'Active', icon: '⚡', iconBg: '#eff6ff', iconColor: '#2563eb' },
  { key: 'overdue',    label: 'Overdue',        icon: '⏰', iconBg: '#fef2f2', iconColor: '#dc2626' },
  { key: 'onHold',     label: 'On Hold',        icon: '⏸',  iconBg: '#f8fafc', iconColor: '#475569' },
  { key: 'completed',  label: 'Completed',      icon: '✅', iconBg: '#f0fdf4', iconColor: '#059669' },
  { key: 'cancelled',  label: 'Cancelled',      icon: '✗',  iconBg: '#fff7ed', iconColor: '#ea580c' },
  { key: 'total',      label: 'Total Orders',   icon: '☰',  iconBg: '#faf5ff', iconColor: '#7c3aed' },
] as const;

export default function SummaryCards() {
  const { profile, user } = useAuth();
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, onHold: 0, completed: 0, cancelled: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (!profile) {
        setLoading(false);
        return;
      }

      // Get visible statuses for this role
      const visibleStatuses = ROLE_VISIBLE_STATUSES[profile.role];
      
      // Build the query based on role
      let query = supabase
        .from('orders')
        .select('current_status, target_completion_date');

      // Filter by archived status
      query = query.eq('is_archived', false);

      // For sales role, filter by salesperson_id
      if (profile.role === ROLES.SALES && user) {
        query = query.eq('salesperson_id', user.id);
      }

      const { data } = await query;

      if (!data) { setLoading(false); return; }

      const today = new Date();
      const s: Stats = { total: 0, active: 0, onHold: 0, completed: 0, cancelled: 0, overdue: 0 };

      data.forEach(o => {
        // Only count if status is visible to this role
        if (!visibleStatuses.includes(o.current_status)) return;

        s.total++;

        if (o.current_status === STATUSES.ON_HOLD) s.onHold++;
        else if (o.current_status === STATUSES.COMPLETED_CLOSED) s.completed++;
        else if (o.current_status === STATUSES.CANCELLED) s.cancelled++;
        else s.active++;

        if (
          o.target_completion_date &&
          o.current_status !== STATUSES.COMPLETED_CLOSED &&
          o.current_status !== STATUSES.CANCELLED &&
          new Date(o.target_completion_date) < today
        ) s.overdue++;
      });

      setStats(s);
      setLoading(false);
    }
    fetchStats();
  }, [profile, user]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-3">
        <Spinner animation="border" size="sm" variant="primary" />
      </div>
    );
  }

  return (
    <Row className="g-3 mb-4">
      {CARD_CONFIG.map(({ key, label, icon, iconBg, iconColor }) => (
        <Col xs={6} sm={4} md={2} key={key}>
          <div className="summary-card">
            <div className="summary-icon" style={{ background: iconBg }}>
              <span style={{ color: iconColor }}>{icon}</span>
            </div>
            <div>
              <div className="summary-value">{stats[key]}</div>
              <div className="summary-label">{label}</div>
            </div>
          </div>
        </Col>
      ))}
    </Row>
  );
}

