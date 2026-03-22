import { useState } from 'react';
import { financialReports } from '../api/services';
import { BarChart3, FileText, TrendingUp } from 'lucide-react';

const reportTypes = [
  { key: 'result', label: 'Resultatrapport', icon: TrendingUp, fn: 'resultReport' },
  { key: 'balance', label: 'Balansrapport', icon: BarChart3, fn: 'balanceReport' },
  { key: 'monthlyResult', label: 'Månadsresultat', icon: FileText, fn: 'monthlyResultReport' },
  { key: 'monthlyBalance', label: 'Månadsbalans', icon: BarChart3, fn: 'monthlyBalanceReport' },
];

export default function Reports() {
  const [activeReport, setActiveReport] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async (report) => {
    setActiveReport(report.key);
    setLoading(true);
    try {
      const res = await financialReports[report.fn]({});
      setReportData(res.data);
    } catch {
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Rapporter</h2>
      </div>
      <div className="report-grid">
        {reportTypes.map((report) => (
          <button
            key={report.key}
            className={`report-card ${activeReport === report.key ? 'active' : ''}`}
            onClick={() => generateReport(report)}
          >
            <report.icon size={32} />
            <span>{report.label}</span>
          </button>
        ))}
      </div>
      {loading && <p className="loading-text">Genererar rapport...</p>}
      {reportData && !loading && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h3>Rapportresultat</h3>
          <pre className="report-output">{JSON.stringify(reportData, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
