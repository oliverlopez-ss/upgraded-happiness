import { useState, useEffect } from 'react';
import { customers } from '../api/services';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';

const columns = [
  { key: 'name', label: 'Namn' },
  { key: 'organizationNumber', label: 'Org.nr' },
  { key: 'email', label: 'E-post' },
  { key: 'phone', label: 'Telefon' },
  { key: 'city', label: 'Ort' },
  { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v || 'Active'} /> },
];

export default function Customers() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    customers.list()
      .then((res) => setData(res.data.items || res.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = data.filter((c) =>
    !search ||
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.organizationNumber || '').includes(search)
  );

  return (
    <div className="page">
      <div className="page-header">
        <h2>Kunder</h2>
        <div className="page-actions">
          <input
            type="text"
            placeholder="Sök kunder..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>
      </div>
      <DataTable columns={columns} data={filtered} loading={loading} emptyMessage="Inga kunder hittades" />
    </div>
  );
}
