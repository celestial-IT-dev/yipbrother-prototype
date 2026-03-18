import React, { useEffect, useMemo, useState } from 'react';
import { Badge, Spinner } from 'react-bootstrap';
import { supabase } from '../../lib/supabaseClient';
import { ROLE_VISIBLE_STATUSES, ROLES, STATUSES } from '../../lib/constants';
import { useAuth } from '../../context/useAuth';

interface InsightStats {
  total: number;
  open: number;
  completed: number;
  overdue: number;
  dueSoon: number;
  exceptions: number;
  bottleneckKey: string | null;
  bottleneckLabel: string;
  bottleneckCount: number;
}

const STAGE_CONFIG = [
  {
    key: 'commercial',
    label: 'Commercial',
    statuses: [
      STATUSES.DRAFT,
      STATUSES.PENDING_CUSTOMER_CONFIRMATION,
      STATUSES.CUSTOMER_CONFIRMED,
      STATUSES.PENDING_PAYMENT,
    ],
  },
  {
    key: 'engineering',
    label: 'Engineering',
    statuses: [
      STATUSES.ORDER_RELEASED_TO_ENGINEERING,
      STATUSES.DESIGN_IN_PROGRESS,
      STATUSES.PENDING_DESIGN_APPROVAL,
    ],
  },
  {
    key: 'materials',
    label: 'Materials',
    statuses: [
      STATUSES.MATERIAL_PLANNING,
      STATUSES.WAITING_FOR_MATERIALS,
      STATUSES.MATERIALS_READY,
    ],
  },
  {
    key: 'production',
    label: 'Production',
    statuses: [
      STATUSES.PENDING_TO_START,
      STATUSES.PRODUCTION_STARTED,
      STATUSES.FABRICATION_IN_PROGRESS,
      STATUSES.ASSEMBLY_IN_PROGRESS,
      STATUSES.PAINTING_IN_PROGRESS,
      STATUSES.INSTALLATION_IN_PROGRESS,
    ],
  },
  {
    key: 'qa_delivery',
    label: 'QA / Delivery',
    statuses: [
      STATUSES.QUALITY_INSPECTION,
      STATUSES.READY_FOR_DELIVERY,
      STATUSES.INQUIRE_DELIVERY_METHOD,
      STATUSES.PENDING_FINAL_PAYMENT,
      STATUSES.SIGN_OFF,
    ],
  },
] as const;

const EXCEPTION_STATUSES = new Set([
  STATUSES.ON_HOLD,
  STATUSES.REWORK_REQUIRED,
  STATUSES.REJECTED_REVISION_REQUESTED,
]);

const BOTTLENECK_ACTIONS: Record<string, string> = {
  commercial: 'Follow up quotations and confirmations to release orders faster.',
  engineering: 'Prioritize drawing approvals and clear pending design decisions.',
  materials: 'Escalate procurement for waiting materials and secure alternates.',
  production: 'Rebalance floor capacity and sequence work by due date.',
  qa_delivery: 'Pull QA checks forward and pre-arrange delivery windows.',
};

function getRiskBadge(overdue: number, open: number): { text: string; variant: 'danger' | 'warning' | 'success' } {
  if (open === 0) return { text: 'Stable', variant: 'success' };
  const ratio = overdue / open;
  if (ratio >= 0.3) return { text: 'High Risk', variant: 'danger' };
  if (ratio >= 0.15) return { text: 'Watchlist', variant: 'warning' };
  return { text: 'Stable', variant: 'success' };
}

export default function OperationalInsights() {
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<InsightStats>({
    total: 0,
    open: 0,
    completed: 0,
    overdue: 0,
    dueSoon: 0,
    exceptions: 0,
    bottleneckKey: null,
    bottleneckLabel: 'None',
    bottleneckCount: 0,
  });

  useEffect(() => {
    async function fetchInsights() {
      if (!profile) {
        setLoading(false);
        return;
      }

      const visibleStatuses = ROLE_VISIBLE_STATUSES[profile.role];
      let query = supabase
        .from('orders')
        .select('current_status, target_completion_date')
        .eq('is_archived', false);

      if (profile.role === ROLES.SALES && user) {
        query = query.eq('salesperson_id', user.id);
      }

      const { data } = await query;
      if (!data) {
        setLoading(false);
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const in7Days = new Date(today);
      in7Days.setDate(in7Days.getDate() + 7);

      const stageCount: Record<string, number> = {};
      STAGE_CONFIG.forEach(stage => {
        stageCount[stage.key] = 0;
      });

      let total = 0;
      let open = 0;
      let completed = 0;
      let overdue = 0;
      let dueSoon = 0;
      let exceptions = 0;

      data.forEach(order => {
        if (!visibleStatuses.includes(order.current_status)) return;

        total++;

        if (EXCEPTION_STATUSES.has(order.current_status)) {
          exceptions++;
        }

        const stage = STAGE_CONFIG.find(item =>
          (item.statuses as readonly string[]).includes(order.current_status)
        );
        if (stage) {
          stageCount[stage.key] = (stageCount[stage.key] || 0) + 1;
        }

        const isClosed =
          order.current_status === STATUSES.COMPLETED_CLOSED ||
          order.current_status === STATUSES.CANCELLED;

        if (!isClosed) {
          open++;
        }
        if (order.current_status === STATUSES.COMPLETED_CLOSED) {
          completed++;
        }

        if (order.target_completion_date && !isClosed) {
          const targetDate = new Date(order.target_completion_date);
          targetDate.setHours(0, 0, 0, 0);

          if (targetDate < today) overdue++;
          if (targetDate >= today && targetDate <= in7Days) dueSoon++;
        }
      });

      const stageEntries = STAGE_CONFIG.map(stage => ({
        key: stage.key,
        label: stage.label,
        count: stageCount[stage.key] || 0,
      }));

      const bottleneck = stageEntries.sort((a, b) => b.count - a.count)[0];

      setStats({
        total,
        open,
        completed,
        overdue,
        dueSoon,
        exceptions,
        bottleneckKey: bottleneck?.key || null,
        bottleneckLabel: bottleneck?.label || 'None',
        bottleneckCount: bottleneck?.count || 0,
      });
      setLoading(false);
    }

    fetchInsights();
  }, [profile, user]);

  const recommendations = useMemo(() => {
    const items: string[] = [];

    if (stats.bottleneckKey && stats.bottleneckCount > 0) {
      items.push(BOTTLENECK_ACTIONS[stats.bottleneckKey]);
    }
    if (stats.overdue > 0) {
      items.push('Run a daily recovery huddle on overdue jobs and assign owners per order.');
    }
    if (stats.dueSoon > 0) {
      items.push('Reserve near-term capacity for orders due within 7 days to reduce slippage.');
    }
    if (stats.exceptions > 0) {
      items.push('Clear exception queue (on hold, rework, revision) before accepting extra WIP.');
    }
    if (items.length === 0) {
      items.push('Flow looks healthy. Keep weekly cadence reviews and monitor stage loading.');
    }

    return items.slice(0, 3);
  }, [stats]);

  if (loading) {
    return (
      <div className="text-center py-3">
        <Spinner animation="border" size="sm" />
      </div>
    );
  }

  const risk = getRiskBadge(stats.overdue, stats.open);
  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="ops-insights-wrap">
      <div className="ops-insight-grid">
        <div className="ops-insight-tile">
          <div className="ops-insight-kicker">Bottleneck Stage</div>
          <div className="ops-insight-value">{stats.bottleneckLabel}</div>
          <div className="ops-insight-meta">{stats.bottleneckCount} order{stats.bottleneckCount !== 1 ? 's' : ''} currently concentrated</div>
        </div>

        <div className="ops-insight-tile">
          <div className="ops-insight-kicker">Delivery Risk</div>
          <div className="ops-insight-value">{stats.overdue}/{stats.open || 0}</div>
          <div className="ops-insight-meta">
            overdue/open <Badge bg={risk.variant} className="ms-1">{risk.text}</Badge>
          </div>
        </div>

        <div className="ops-insight-tile">
          <div className="ops-insight-kicker">Near-Term Load</div>
          <div className="ops-insight-value">{stats.dueSoon}</div>
          <div className="ops-insight-meta">orders due in the next 7 days</div>
        </div>

        <div className="ops-insight-tile">
          <div className="ops-insight-kicker">Throughput</div>
          <div className="ops-insight-value">{completionRate}%</div>
          <div className="ops-insight-meta">completion rate from visible orders</div>
        </div>
      </div>

      <div className="ops-actions-panel mt-3">
        <div className="ops-actions-title">Recommended Actions</div>
        <ul className="ops-actions-list mb-0">
          {recommendations.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
