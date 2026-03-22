import { useState, useEffect } from 'react';
import { transactions } from '../api/services';
import DataTable from '../components/DataTable';

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'description', label: 'Beskrivning' },
  { key: 'amount', label: 'Belopp', render: (v) => v != null ? `${v.toLocaleString('sv-SE')} kr` : '—' },
  { key: 'date', label: 'Datum', render: (v) => v ? new Date(v).toLocaleDateString('sv-SE') : '—' },
  { key: 'category', label: 'Kategori' },
];

export default function Transactions() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    transactions.list()
      .then((res) => setData(res.data.items || res.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Transaktioner</h2>
      </div>
      <DataTable columns={columns} data={data} loading={loading} emptyMessage="Inga transaktioner hittades" />
    </div>
  );
}
