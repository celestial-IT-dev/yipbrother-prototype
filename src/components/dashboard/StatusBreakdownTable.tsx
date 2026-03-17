import React, { useEffect, useState } from 'react';
import { Badge, Spinner } from 'react-bootstrap';
import { supabase } from '../../lib/supabaseClient';
import { STATUS_COLORS, ROLE_VISIBLE_STATUSES, ROLES } from '../../lib/constants';
import { useAuth } from '../../context/useAuth';

interface StatusCount {
  status: string;
  count: number;
}

export default function StatusBreakdownTable() {
  const { profile, user } = useAuth();
  const [data, setData] = useState<StatusCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    async function fetch() {
      if (!profile) {
        setLoading(false);
        return;
      }

      // Get visible statuses for this role
      const visibleStatuses = ROLE_VISIBLE_STATUSES[profile.role];

      // Build the query based on role
      let query = supabase
        .from('orders')
        .select('current_status');

      // Filter by archived status
      query = query.eq('is_archived', false);

      // For sales role, filter by salesperson_id
      if (profile.role === ROLES.SALES && user) {
        query = query.eq('salesperson_id', user.id);
      }

      const { data: orders } = await query;

      if (!orders) { setLoading(false); return; }

      // Filter by visible statuses
      const filteredOrders = orders.filter(o => visibleStatuses.includes(o.current_status));

      const counts: Record<string, number> = {};
      filteredOrders.forEach(o => {
        counts[o.current_status] = (counts[o.current_status] || 0) + 1;
      });

      const sorted = Object.entries(counts)
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count);

      setData(sorted);
      setTotal(filteredOrders.length);
      setLoading(false);
    }
    fetch();
  }, [profile, user]);

  if (loading) return <div className="text-center py-3"><Spinner animation="border" size="sm" /></div>;
  if (data.length === 0) return (
    <div className="text-center py-3" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
      No orders yet.
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {data.map(({ status, count }) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const variant = STATUS_COLORS[status] || 'secondary';
        return (
          <div key={status} className="d-flex align-items-center gap-2">
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="d-flex align-items-center justify-content-between mb-1">
                <Badge bg={variant} style={{ fontWeight: 500, fontSize: '0.75rem', borderRadius: '100px' }}>
                  {status}
                </Badge>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)', marginLeft: '0.5rem' }}>
                  {count}
                </span>
              </div>
              <div style={{ height: 4, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: `var(--bs-${variant}, #64748b)`,
                    borderRadius: 4,
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
