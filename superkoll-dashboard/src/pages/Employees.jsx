import { useState, useEffect } from 'react';
import { employees } from '../api/services';
import DataTable from '../components/DataTable';

const columns = [
  { key: 'firstName', label: 'Förnamn' },
  { key: 'lastName', label: 'Efternamn' },
  { key: 'email', label: 'E-post' },
  { key: 'phone', label: 'Telefon' },
  { key: 'title', label: 'Titel' },
];

export default function Employees() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    employees.list()
      .then((res) => setData(res.data.items || res.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = data.filter((e) =>
    !search ||
    `${e.firstName} ${e.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    (e.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <div className="page-header">
        <h2>Anställda</h2>
        <div className="page-actions">
          <input type="text" placeholder="Sök anställda..." value={search} onChange={(e) => setSearch(e.target.value)} className="search-input" />
        </div>
      </div>
      <DataTable columns={columns} data={filtered} loading={loading} emptyMessage="Inga anställda hittades" />
    </div>
  );
}
