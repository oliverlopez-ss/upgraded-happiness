import { useState, useEffect } from 'react';
import { articles } from '../api/services';
import DataTable from '../components/DataTable';

const columns = [
  { key: 'name', label: 'Namn' },
  { key: 'articleNumber', label: 'Artikelnr' },
  { key: 'price', label: 'Pris', render: (v) => v != null ? `${v.toLocaleString('sv-SE')} kr` : '—' },
  { key: 'unit', label: 'Enhet' },
  { key: 'vatPercentage', label: 'Moms %' },
];

export default function Articles() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    articles.list()
      .then((res) => setData(res.data.items || res.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = data.filter((a) =>
    !search || (a.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <div className="page-header">
        <h2>Artiklar</h2>
        <div className="page-actions">
          <input type="text" placeholder="Sök artiklar..." value={search} onChange={(e) => setSearch(e.target.value)} className="search-input" />
        </div>
      </div>
      <DataTable columns={columns} data={filtered} loading={loading} emptyMessage="Inga artiklar hittades" />
    </div>
  );
}
