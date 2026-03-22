import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, FileText, Users, Receipt, UserCog,
  Package, BookOpen, CreditCard, BarChart3, Clock,
  HelpCircle, Menu, X, LogOut, Search, ChevronDown, ChevronRight,
  DollarSign, Layers
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/invoices', label: 'Fakturor', icon: FileText },
  { path: '/customers', label: 'Kunder', icon: Users },
  { path: '/receipts', label: 'Kvitton', icon: Receipt },
  { path: '/employees', label: 'Anställda', icon: UserCog },
  { path: '/articles', label: 'Artiklar', icon: Package },
  { path: '/accounts', label: 'Konton', icon: BookOpen },
  { path: '/vouchers', label: 'Verifikationer', icon: CreditCard },
  { path: '/transactions', label: 'Transaktioner', icon: DollarSign },
  { path: '/reports', label: 'Rapporter', icon: BarChart3 },
  { path: '/salary', label: 'Lön', icon: DollarSign },
  { path: '/dimensions', label: 'Dimensioner', icon: Layers },
  { path: '/time-reports', label: 'Tidrapporter', icon: Clock },
  { path: '/support', label: 'Support', icon: HelpCircle },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="app-layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="sidebar-header">
          {sidebarOpen && <h1 className="sidebar-title">Superkoll</h1>}
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`nav-item ${location.pathname === path ? 'active' : ''}`}
              title={label}
            >
              <Icon size={20} />
              {sidebarOpen && <span>{label}</span>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          {sidebarOpen && user && (
            <div className="user-info">
              <span className="user-name">{user.companyName || 'Företag'}</span>
            </div>
          )}
          <button className="nav-item logout-btn" onClick={logout} title="Logga ut">
            <LogOut size={20} />
            {sidebarOpen && <span>Logga ut</span>}
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
