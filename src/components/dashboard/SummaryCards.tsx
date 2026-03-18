import React, { useEffect, useState } from "react";
import { Row, Col, Spinner } from "react-bootstrap";
import { supabase } from "../../lib/supabaseClient";
import { STATUSES, ROLE_VISIBLE_STATUSES, ROLES } from "../../lib/constants";
import { useAuth } from "../../context/useAuth";

interface StageData {
  key: string;
  label: string;
  count: number;
  color: string;
}

interface SupplyStats {
  total: number;
  open: number;
  completed: number;
  overdue: number;
  dueSoon: number;
  exceptions: number;
  completionRate: number;
  onTimeRate: number;
  stageData: StageData[];
}

const STAGE_CONFIG = [
  {
    key: "commercial",
    label: "Commercial",
    color: "#2563eb",
    statuses: [
      STATUSES.DRAFT,
      STATUSES.PENDING_CUSTOMER_CONFIRMATION,
      STATUSES.CUSTOMER_CONFIRMED,
      STATUSES.PENDING_PAYMENT,
    ],
  },
  {
    key: "engineering",
    label: "Engineering",
    color: "#7c3aed",
    statuses: [
      STATUSES.ORDER_RELEASED_TO_ENGINEERING,
      STATUSES.DESIGN_IN_PROGRESS,
      STATUSES.PENDING_DESIGN_APPROVAL,
    ],
  },
  {
    key: "materials",
    label: "Materials",
    color: "#d97706",
    statuses: [
      STATUSES.MATERIAL_PLANNING,
      STATUSES.WAITING_FOR_MATERIALS,
      STATUSES.MATERIALS_READY,
    ],
  },
  {
    key: "production",
    label: "Production",
    color: "#0f766e",
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
    key: "qa_delivery",
    label: "QA / Delivery",
    color: "#0284c7",
    statuses: [
      STATUSES.QUALITY_INSPECTION,
      STATUSES.READY_FOR_DELIVERY,
      STATUSES.INQUIRE_DELIVERY_METHOD,
      STATUSES.PENDING_FINAL_PAYMENT,
      STATUSES.SIGN_OFF,
    ],
  },
  {
    key: "closed",
    label: "Closed",
    color: "#059669",
    statuses: [STATUSES.COMPLETED_CLOSED, STATUSES.CANCELLED],
  },
] as const;

const EXCEPTION_STATUSES = new Set([
  STATUSES.ON_HOLD,
  STATUSES.REWORK_REQUIRED,
  STATUSES.REJECTED_REVISION_REQUESTED,
]);

const KPI_CONFIG = [
  { key: "open", label: "Open Orders", hint: "Work currently in the pipeline" },
  {
    key: "overdue",
    label: "Overdue Orders",
    hint: "Target date already missed",
  },
  {
    key: "dueSoon",
    label: "Due in 7 Days",
    hint: "Near-term delivery pressure",
  },
  {
    key: "exceptions",
    label: "Exceptions",
    hint: "On hold / rework / revision",
  },
  {
    key: "completionRate",
    label: "Completion Rate",
    hint: "Closed as completed",
    suffix: "%",
  },
  {
    key: "onTimeRate",
    label: "On-Time Rate",
    hint: "Non-overdue among active",
    suffix: "%",
  },
] as const;

export default function SummaryCards() {
  const { profile, user } = useAuth();
  const [stats, setStats] = useState<SupplyStats>({
    total: 0,
    open: 0,
    completed: 0,
    overdue: 0,
    dueSoon: 0,
    exceptions: 0,
    completionRate: 0,
    onTimeRate: 0,
    stageData: STAGE_CONFIG.map((stage) => ({
      key: stage.key,
      label: stage.label,
      count: 0,
      color: stage.color,
    })),
  });
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
        .from("orders")
        .select("current_status, target_completion_date");

      // Filter by archived status
      query = query.eq("is_archived", false);

      // For sales role, filter by salesperson_id
      if (profile.role === ROLES.SALES && user) {
        query = query.eq("salesperson_id", user.id);
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

      const stageCounts: Record<string, number> = {};
      STAGE_CONFIG.forEach((stage) => {
        stageCounts[stage.key] = 0;
      });

      let total = 0;
      let open = 0;
      let completed = 0;
      let overdue = 0;
      let dueSoon = 0;
      let exceptions = 0;

      data.forEach((o) => {
        // Only count if status is visible to this role
        if (!visibleStatuses.includes(o.current_status)) return;

        total++;

        if (EXCEPTION_STATUSES.has(o.current_status)) {
          exceptions++;
        }

        const stage = STAGE_CONFIG.find((item) =>
          (item.statuses as readonly string[]).includes(o.current_status),
        );
        if (stage) {
          stageCounts[stage.key] = (stageCounts[stage.key] || 0) + 1;
        }

        const isClosed =
          o.current_status === STATUSES.COMPLETED_CLOSED ||
          o.current_status === STATUSES.CANCELLED;
        const isCompleted = o.current_status === STATUSES.COMPLETED_CLOSED;

        if (isCompleted) {
          completed++;
        }

        if (!isClosed) {
          open++;
        }

        if (o.target_completion_date && !isClosed) {
          const targetDate = new Date(o.target_completion_date);
          targetDate.setHours(0, 0, 0, 0);

          if (targetDate < today) {
            overdue++;
          }

          if (targetDate >= today && targetDate <= in7Days) {
            dueSoon++;
          }
        }
      });

      const completionRate =
        total > 0 ? Math.round((completed / total) * 100) : 0;
      const onTimeRate =
        open > 0
          ? Math.max(0, Math.round(((open - overdue) / open) * 100))
          : 100;

      setStats({
        total,
        open,
        completed,
        overdue,
        dueSoon,
        exceptions,
        completionRate,
        onTimeRate,
        stageData: STAGE_CONFIG.map((stage) => ({
          key: stage.key,
          label: stage.label,
          count: stageCounts[stage.key] || 0,
          color: stage.color,
        })),
      });
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
    <div className="mb-4">
      <Row className="g-3">
        {KPI_CONFIG.map((item) => (
          <Col xs={12} sm={6} xl={4} key={item.key}>
            <div className="supply-kpi-card h-100">
              <div className="supply-kpi-label">{item.label}</div>
              <div className="supply-kpi-value">
                {stats[item.key]}
                {"suffix" in item ? item.suffix : ""}
              </div>
              <div className="supply-kpi-hint">{item.hint}</div>
            </div>
          </Col>
        ))}

        {(profile?.role === ROLES.SALES || profile?.role === ROLES.ADMIN) && (
          <Col xs={12}>
            <div className="supply-chart-card">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                  <div className="supply-chart-title">
                    Pipeline Distribution
                  </div>
                  <div className="supply-chart-subtitle">
                    How visible orders are spread across supply chain stages
                  </div>
                </div>
                <div className="supply-chart-total">
                  {stats.total} total visible orders
                </div>
              </div>

              <div
                className="supply-stacked-bar mt-3"
                role="img"
                aria-label="Order pipeline distribution by stage"
              >
                {stats.stageData.map((stage) => {
                  const widthPct =
                    stats.total > 0
                      ? Math.max(
                        (stage.count / stats.total) * 100,
                        stage.count > 0 ? 2 : 0,
                      )
                      : 0;
                  return (
                    <div
                      key={stage.key}
                      className="supply-stacked-segment"
                      style={{ width: `${widthPct}%`, background: stage.color }}
                      title={`${stage.label}: ${stage.count}`}
                    />
                  );
                })}
              </div>

              <div className="supply-stage-grid mt-3">
                {stats.stageData.map((stage) => {
                  const pct =
                    stats.total > 0
                      ? Math.round((stage.count / stats.total) * 100)
                      : 0;
                  return (
                    <div key={stage.key} className="supply-stage-item">
                      <span
                        className="supply-stage-dot"
                        style={{ background: stage.color }}
                      />
                      <span className="supply-stage-label">{stage.label}</span>
                      <span className="supply-stage-meta">
                        {stage.count} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Col>
        )}
      </Row>
    </div>
  );
}
