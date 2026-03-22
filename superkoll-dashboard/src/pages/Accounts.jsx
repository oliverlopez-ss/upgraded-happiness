import { useState, useEffect } from 'react';
import { accounts } from '../api/services';
import DataTable from '../components/DataTable';

const columns = [
  { key: 'accountNumber', label: 'Kontonr' },
  { key: 'name', label: 'Namn' },
  { key: 'balance', label: 'Saldo', render: (v) => v != null ? `${v.toLocaleString('sv-SE')} kr` : '—' },
  { key: 'type', label: 'Typ' },
];

export default function Accounts() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    accounts.list()
      .then((res) => setData(res.data.items || res.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = data.filter((a) =>
    !search ||
    (a.name || '').toLowerCase().includes(search.toLowerCase()) ||
    String(a.accountNumber || '').includes(search)
  );

  return (
    <div className="page">
      <div className="page-header">
        <h2>Konton</h2>
        <div className="page-actions">
          <input type="text" placeholder="Sök konton..." value={search} onChange={(e) => setSearch(e.target.value)} className="search-input" />
        </div>
      </div>
      <DataTable columns={columns} data={filtered} loading={loading} emptyMessage="Inga konton hittades" />
    </div>
  );
}
