import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  BookPlus,
  BookCheck,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Menu,
  User,
  Users,
  Feather,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  end?: boolean;
}

const adminNav: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={17} />, end: true },
  { to: '/admin/books', label: 'Book Management', icon: <BookOpen size={17} /> },
  { to: '/admin/authors', label: 'Author Management', icon: <Feather size={17} /> },
  { to: '/admin/members', label: 'Member Management', icon: <Users size={17} /> },
  { to: '/admin/issue', label: 'Issue Books', icon: <BookPlus size={17} /> },
  { to: '/admin/return', label: 'Return Books', icon: <BookCheck size={17} /> },
  { to: '/admin/transactions', label: 'Transactions', icon: <ArrowLeftRight size={17} /> },
  { to: '/admin/fines', label: 'Fine Management', icon: <IndianRupee size={17} /> },
  { to: '/admin/reports', label: 'Reports', icon: <BarChart3 size={17} /> },
];

const memberNav: NavItem[] = [
  { to: '/member', label: 'Dashboard', icon: <LayoutDashboard size={17} />, end: true },
  { to: '/member/books', label: 'Browse Books', icon: <BookOpen size={17} /> },
  { to: '/member/authors', label: 'View Authors', icon: <Feather size={17} /> },
  { to: '/member/borrowed', label: 'My Borrowed Books', icon: <BookCheck size={17} /> },
  { to: '/member/transactions', label: 'Transaction History', icon: <ArrowLeftRight size={17} /> },
  { to: '/member/fines', label: 'My Fines', icon: <IndianRupee size={17} /> },
  { to: '/member/profile', label: 'My Profile', icon: <User size={17} /> },
];

export function AppLayout({ role }: { role: 'ADMIN' | 'MEMBER' }) {
  const { appUser, memberProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = role === 'ADMIN' ? adminNav : memberNav;
  const displayName = role === 'ADMIN' ? 'Librarian / Admin' : memberProfile?.name || appUser?.email;

  async function handleLogout() {
    await signOut();
    navigate('/');
  }

  return (
    <div className="app-shell">
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand" style={{ justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <BookOpen size={19} />
            <span>LIBRARY SYSTEM</span>
          </span>
          {sidebarOpen && (
            <button
              type="button"
              className="mobile-menu-btn"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close navigation"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <nav className="sidebar-nav" aria-label="Primary navigation">
          <div className="sidebar-section-label">
            {role === 'ADMIN' ? 'Administrator Portal' : 'Member Portal'}
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div style={{ fontSize: '0.8rem', marginBottom: '0.6rem', color: 'var(--text-secondary)' }}>
            <div style={{ fontWeight: 600, color: 'var(--text)' }}>{displayName}</div>
            <div style={{ wordBreak: 'break-all' }}>{appUser?.email}</div>
          </div>
          <button type="button" className="btn btn-secondary btn-block btn-sm" onClick={handleLogout}>
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={18} />
            </button>
            <span style={{ fontWeight: 600, fontSize: '0.925rem' }}>
              LIBRARY MANAGEMENT SYSTEM
            </span>
          </div>

          <div className="topbar-right">
            <span className="badge">{role === 'ADMIN' ? 'Administrator' : memberProfile?.membership_type || 'Member'}</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleLogout}>
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
