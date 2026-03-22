const statusColors = {
  draft: '#6b7280',
  sent: '#3b82f6',
  paid: '#10b981',
  overdue: '#ef4444',
  cancelled: '#9ca3af',
  approved: '#10b981',
  rejected: '#ef4444',
  pending: '#f59e0b',
  active: '#10b981',
  inactive: '#9ca3af',
  created: '#3b82f6',
  resolved: '#10b981',
  unresolved: '#f59e0b',
};

export default function StatusBadge({ status }) {
  const normalizedStatus = (status || '').toLowerCase();
  const color = statusColors[normalizedStatus] || '#6b7280';

  return (
    <span className="status-badge" style={{ backgroundColor: color }}>
      {status}
    </span>
  );
}
