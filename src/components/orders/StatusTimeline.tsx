import React from 'react';
import { STATUS_COLORS } from '../../lib/constants';
import { Badge } from 'react-bootstrap';

interface HistoryEntry {
  id: string;
  previous_status: string | null;
  new_status: string;
  remark: string | null;
  created_at: string;
  profiles: { full_name: string; role: string } | null;
}

interface Props {
  history: HistoryEntry[];
}

const STATUS_BG: Record<string, string> = {
  primary: '#2563eb',
  secondary: '#64748b',
  success: '#059669',
  danger: '#dc2626',
  warning: '#d97706',
  info: '#0891b2',
  dark: '#1e293b',
};

export default function StatusTimeline({ history }: Props) {
  if (!history || history.length === 0) {
    return (
      <div className="text-center py-4" style={{ color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '2rem' }}>📋</div>
        <p className="mt-2 mb-0" style={{ fontSize: '0.875rem' }}>No status history yet.</p>
      </div>
    );
  }

  return (
    <div className="timeline-wrap">
      {[...history].reverse().map((entry) => {
        const variant = STATUS_COLORS[entry.new_status] || 'secondary';
        const dotColor = STATUS_BG[variant] || '#64748b';
        const date = new Date(entry.created_at);

        return (
          <div key={entry.id} className="timeline-item">
            <div
              className="timeline-dot"
              style={{ background: dotColor }}
            />
            <div className="timeline-card">
              <div className="d-flex flex-wrap align-items-start justify-content-between gap-2">
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <Badge
                    bg={variant}
                    style={{ fontWeight: 500, fontSize: '0.78rem', borderRadius: '100px' }}
                  >
                    {entry.new_status}
                  </Badge>
                  {entry.previous_status && (
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      ← from {entry.previous_status}
                    </small>
                  )}
                </div>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                  {date.toLocaleDateString()} · {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </small>
              </div>

              <div className="mt-1" style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                by <strong style={{ color: 'var(--text)' }}>{entry.profiles?.full_name || 'Unknown'}</strong>
                {entry.profiles?.role && (
                  <span
                    className="ms-2"
                    style={{
                      fontSize: '0.68rem',
                      padding: '0.1rem 0.4rem',
                      background: 'var(--surface-3)',
                      borderRadius: '100px',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {entry.profiles.role}
                  </span>
                )}
              </div>

              {entry.remark && (
                <div className="timeline-remark">
                  "{entry.remark}"
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
