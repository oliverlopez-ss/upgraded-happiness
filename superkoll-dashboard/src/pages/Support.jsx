import { useState, useEffect } from 'react';
import { support } from '../api/services';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'subject', label: 'Ämne' },
  { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
  { key: 'createdDate', label: 'Skapad', render: (v) => v ? new Date(v).toLocaleDateString('sv-SE') : '—' },
  { key: 'assignedTo', label: 'Tilldelad' },
];

export default function Support() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    support.list()
      .then((res) => setData(res.data.items || res.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Supportärenden</h2>
      </div>
      <DataTable columns={columns} data={data} loading={loading} emptyMessage="Inga supportärenden hittades" />
    </div>
  );
}
