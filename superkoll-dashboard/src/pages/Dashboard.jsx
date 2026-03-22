import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Users, Receipt, UserCog, TrendingUp, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { invoices, customers, receipts, employees } from '../api/services';

function StatCard({ icon: Icon, label, value, color, link }) {
  return (
    <Link to={link} className="stat-card">
      <div className="stat-icon" style={{ backgroundColor: color + '20', color }}>
        <Icon size={24} />
      </div>
      <div className="stat-info">
        <span className="stat-value">{value}</span>
        <span className="stat-label">{label}</span>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    invoiceCount: '—',
    customerCount: '—',
    receiptCount: '—',
    employeeCount: '—',
  });
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      invoices.list({ pageSize: 5 }),
      customers.list({ pageSize: 1 }),
      receipts.list({ pageSize: 1 }),
      employees.list({ pageSize: 1 }),
    ]).then(([invRes, custRes, recRes, empRes]) => {
      setStats({
        invoiceCount: invRes.status === 'fulfilled' ? (invRes.value.data.totalCount ?? invRes.value.data.length ?? '—') : '—',
        customerCount: custRes.status === 'fulfilled' ? (custRes.value.data.totalCount ?? custRes.value.data.length ?? '—') : '—',
        receiptCount: recRes.status === 'fulfilled' ? (recRes.value.data.totalCount ?? recRes.value.data.length ?? '—') : '—',
        employeeCount: empRes.status === 'fulfilled' ? (empRes.value.data.totalCount ?? empRes.value.data.length ?? '—') : '—',
      });
      if (invRes.status === 'fulfilled') {
        setRecentInvoices(invRes.value.data.items || invRes.value.data || []);
      }
      setLoading(false);
    });
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Dashboard</h2>
      </div>

      <div className="stats-grid">
        <StatCard icon={FileText} label="Fakturor" value={stats.invoiceCount} color="#3b82f6" link="/invoices" />
        <StatCard icon={Users} label="Kunder" value={stats.customerCount} color="#10b981" link="/customers" />
        <StatCard icon={Receipt} label="Kvitton" value={stats.receiptCount} color="#f59e0b" link="/receipts" />
        <StatCard icon={UserCog} label="Anställda" value={stats.employeeCount} color="#8b5cf6" link="/employees" />
      </div>

      <div className="card">
        <h3>Senaste fakturor</h3>
        {loading ? (
          <p className="loading-text">Laddar...</p>
        ) : recentInvoices.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nummer</th>
                <th>Kund</th>
                <th>Belopp</th>
                <th>Status</th>
                <th>Datum</th>
              </tr>
            </thead>
            <tbody>
              {recentInvoices.slice(0, 5).map((inv) => (
                <tr key={inv.id}>
                  <td>{inv.invoiceNumber || inv.id}</td>
                  <td>{inv.customerName || '—'}</td>
                  <td>{inv.totalAmount != null ? `${inv.totalAmount.toLocaleString('sv-SE')} kr` : '—'}</td>
                  <td><span className={`status-dot status-${(inv.status || '').toLowerCase()}`}>{inv.status || '—'}</span></td>
                  <td>{inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('sv-SE') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-text">Inga fakturor att visa. Anslut till API:t för att se data.</p>
        )}
      </div>
    </div>
  );
}
