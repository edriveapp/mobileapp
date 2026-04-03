import { BrowserRouter as Router, Navigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  CarFront,
  LayoutDashboard,
  ShieldCheck,
  LifeBuoy,
  LogOut,
  UserCog,
  Bell,
  Settings,
} from 'lucide-react';

import Overview from './pages/Overview.tsx';
import Drivers from './pages/Drivers.tsx';
import UsersRides from './pages/UsersRides.tsx';
import Support from './pages/Support.tsx';
import Login from './pages/Login.tsx';
import Notifications from './pages/Notifications.tsx';
import PlatformSettings from './pages/PlatformSettings.tsx';
import { AuthProvider, useAuth } from './lib/auth.tsx';

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
};

const AppRoutes = () => {
  const { token } = useAuth();
  if (!token) {
    return <Login />;
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/drivers" element={<Drivers />} />
          <Route path="/users-rides" element={<UsersRides />} />
          <Route path="/support" element={<Support />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<PlatformSettings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

const Sidebar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { name: 'Overview', path: '/', icon: LayoutDashboard },
    { name: 'Driver Management', path: '/drivers', icon: ShieldCheck },
    { name: 'Users & Rides', path: '/users-rides', icon: UserCog },
    { name: 'Customer Support', path: '/support', icon: LifeBuoy },
    { name: 'Notifications', path: '/notifications', icon: Bell },
    { name: 'Platform Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col">
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <CarFront className="w-8 h-8 text-emerald-500" />
        <span className="text-xl font-bold tracking-tight text-white">edrive admin</span>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800">
        <div className="mb-3">
          <p className="text-xs text-slate-400">{user?.email}</p>
          <p className="text-[11px] text-emerald-400 uppercase tracking-wide">{user?.role}</p>
        </div>
        <button
          onClick={logout}
          className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-sm flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default App;
