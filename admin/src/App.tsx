import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  Users, 
  CarFront, 
  LayoutDashboard, 
  ShieldCheck, 
  LifeBuoy
} from 'lucide-react';

import Overview from './pages/Overview.tsx';
import Drivers from './pages/Drivers.tsx';
import UsersRides from './pages/UsersRides.tsx';
import Support from './pages/Support.tsx';

const App = () => {
  return (
    <Router>
      <div className="flex h-screen bg-gray-50 font-sans">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/drivers" element={<Drivers />} />
            <Route path="/users-rides" element={<UsersRides />} />
            <Route path="/support" element={<Support />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

const Sidebar = () => {
  const location = useLocation();

  const navItems = [
    { name: 'Overview', path: '/', icon: LayoutDashboard },
    { name: 'Drivers Verification', path: '/drivers', icon: ShieldCheck },
    { name: 'Users & Rides', path: '/users-rides', icon: Users },
    { name: 'Customer Support', path: '/support', icon: LifeBuoy },
  ];

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col">
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <CarFront className="w-8 h-8 text-emerald-500" />
        <span className="text-xl font-bold tracking-tight text-white">edrive admin</span>
      </div>
      <nav className="flex-1 p-4 space-y-2">
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
      <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
        eDrive Admin Panel
      </div>
    </div>
  );
};

export default App;
