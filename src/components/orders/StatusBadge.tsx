import React from 'react';
import { Badge } from 'react-bootstrap';
import { STATUS_COLORS } from '../../lib/constants';

interface Props {
  status: string;
  size?: 'sm' | undefined;
}

export default function StatusBadge({ status, size }: Props) {
  const variant = STATUS_COLORS[status] || 'secondary';
  return (
    <Badge
      bg={variant}
      className={size === 'sm' ? 'fs-7' : 'fs-6 py-1 px-2'}
      style={{ fontWeight: 500, whiteSpace: 'normal', textAlign: 'left' }}
    >
      {status}
    </Badge>
  );
}

