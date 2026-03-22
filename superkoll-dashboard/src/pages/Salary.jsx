import { useState, useEffect } from 'react';
import { salaryDrafts, salaryDeviations } from '../api/services';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';

const draftColumns = [
  { key: 'id', label: 'ID' },
  { key: 'employeeName', label: 'Anställd' },
  { key: 'amount', label: 'Belopp', render: (v) => v != null ? `${v.toLocaleString('sv-SE')} kr` : '—' },
  { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
];

export default function Salary() {
  const [tab, setTab] = useState('drafts');
  const [drafts, setDrafts] = useState([]);
  const [deviations, setDeviations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = tab === 'drafts' ? salaryDrafts.list() : salaryDeviations.list();
    setLoading(true);
    fetch
      .then((res) => {
        const items = res.data.items || res.data || [];
        tab === 'drafts' ? setDrafts(items) : setDeviations(items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Lön</h2>
        <div className="tab-group">
          <button className={`tab ${tab === 'drafts' ? 'active' : ''}`} onClick={() => setTab('drafts')}>Löneutkast</button>
          <button className={`tab ${tab === 'deviations' ? 'active' : ''}`} onClick={() => setTab('deviations')}>Avvikelser</button>
        </div>
      </div>
      <DataTable
        columns={draftColumns}
        data={tab === 'drafts' ? drafts : deviations}
        loading={loading}
        emptyMessage={tab === 'drafts' ? 'Inga löneutkast' : 'Inga avvikelser'}
      />
    </div>
  );
}
