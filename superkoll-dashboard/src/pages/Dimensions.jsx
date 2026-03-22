import { useState, useEffect } from 'react';
import { dimensions } from '../api/services';
import DataTable from '../components/DataTable';

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Namn' },
  { key: 'number', label: 'Nummer' },
  { key: 'type', label: 'Typ' },
];

export default function Dimensions() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dimensions.list()
      .then((res) => setData(res.data.items || res.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Dimensioner</h2>
      </div>
      <DataTable columns={columns} data={data} loading={loading} emptyMessage="Inga dimensioner hittades" />
    </div>
  );
}
