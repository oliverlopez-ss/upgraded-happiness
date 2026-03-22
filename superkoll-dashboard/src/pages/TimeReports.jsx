import { useState, useEffect } from 'react';
import { timeReports } from '../api/services';
import DataTable from '../components/DataTable';

const columns = [
  { key: 'employeeName', label: 'Anställd' },
  { key: 'date', label: 'Datum', render: (v) => v ? new Date(v).toLocaleDateString('sv-SE') : '—' },
  { key: 'hours', label: 'Timmar' },
  { key: 'project', label: 'Projekt' },
  { key: 'status', label: 'Status' },
];

export default function TimeReports() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    timeReports.list()
      .then((res) => setData(res.data.items || res.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Tidrapporter</h2>
      </div>
      <DataTable columns={columns} data={data} loading={loading} emptyMessage="Inga tidrapporter hittades" />
    </div>
  );
}
