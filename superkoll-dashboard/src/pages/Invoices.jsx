import { useState, useEffect } from 'react';
import { invoices } from '../api/services';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';

const columns = [
  { key: 'invoiceNumber', label: 'Nummer' },
  { key: 'customerName', label: 'Kund' },
  { key: 'totalAmount', label: 'Belopp', render: (v) => v != null ? `${v.toLocaleString('sv-SE')} kr` : '—' },
  { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
  { key: 'invoiceDate', label: 'Fakturadatum', render: (v) => v ? new Date(v).toLocaleDateString('sv-SE') : '—' },
  { key: 'dueDate', label: 'Förfallodatum', render: (v) => v ? new Date(v).toLocaleDateString('sv-SE') : '—' },
];

export default function Invoices() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    invoices.list()
      .then((res) => setData(res.data.items || res.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = data.filter((inv) =>
    !search ||
    (inv.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
    String(inv.invoiceNumber || '').includes(search)
  );

  return (
    <div className="page">
      <div className="page-header">
        <h2>Fakturor</h2>
        <div className="page-actions">
          <input
            type="text"
            placeholder="Sök fakturor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>
      </div>
      <DataTable columns={columns} data={filtered} loading={loading} emptyMessage="Inga fakturor hittades" />
    </div>
  );
}
