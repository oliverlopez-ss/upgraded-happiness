import { useState, useEffect } from 'react';
import { receipts } from '../api/services';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'supplierName', label: 'Leverantör' },
  { key: 'totalAmount', label: 'Belopp', render: (v) => v != null ? `${v.toLocaleString('sv-SE')} kr` : '—' },
  { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
  { key: 'receiptDate', label: 'Datum', render: (v) => v ? new Date(v).toLocaleDateString('sv-SE') : '—' },
];

export default function Receipts() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    receipts.list()
      .then((res) => setData(res.data.items || res.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = data.filter((r) =>
    !search || (r.supplierName || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <div className="page-header">
        <h2>Kvitton</h2>
        <div className="page-actions">
          <input type="text" placeholder="Sök kvitton..." value={search} onChange={(e) => setSearch(e.target.value)} className="search-input" />
        </div>
      </div>
      <DataTable columns={columns} data={filtered} loading={loading} emptyMessage="Inga kvitton hittades" />
    </div>
  );
}
