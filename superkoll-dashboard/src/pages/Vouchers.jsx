import { useState, useEffect } from 'react';
import { vouchers } from '../api/services';
import DataTable from '../components/DataTable';

const columns = [
  { key: 'voucherNumber', label: 'Verifikationsnr' },
  { key: 'description', label: 'Beskrivning' },
  { key: 'amount', label: 'Belopp', render: (v) => v != null ? `${v.toLocaleString('sv-SE')} kr` : '—' },
  { key: 'voucherDate', label: 'Datum', render: (v) => v ? new Date(v).toLocaleDateString('sv-SE') : '—' },
  { key: 'series', label: 'Serie' },
];

export default function Vouchers() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    vouchers.list()
      .then((res) => setData(res.data.items || res.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = data.filter((v) =>
    !search || (v.description || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <div className="page-header">
        <h2>Verifikationer</h2>
        <div className="page-actions">
          <input type="text" placeholder="Sök verifikationer..." value={search} onChange={(e) => setSearch(e.target.value)} className="search-input" />
        </div>
      </div>
      <DataTable columns={columns} data={filtered} loading={loading} emptyMessage="Inga verifikationer hittades" />
    </div>
  );
}
