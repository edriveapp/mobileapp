import React from 'react';
import { Search } from 'lucide-react';
import { apiRequest } from '../lib/api.ts';
import { useAuth } from '../lib/auth.tsx';

type RideItem = {
  id: string;
  origin: string;
  destination: string;
  status: string;
  driverName: string;
  gmv: number;
  platformCut: number;
  date: string;
};

type UserItem = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'passenger' | 'driver' | 'admin';
  adminScope?: 'none' | 'super_admin' | 'verification' | 'support' | 'operations';
  verificationStatus?: string;
  createdAt?: string;
};

type TabKey = 'rides' | 'passengers' | 'drivers' | 'team';

export default function UsersRides() {
  const { token, user: currentAdmin } = useAuth();
  const [tab, setTab] = React.useState<TabKey>('rides');
  const [query, setQuery] = React.useState('');
  const [rides, setRides] = React.useState<RideItem[]>([]);
  const [users, setUsers] = React.useState<UserItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [newAdmin, setNewAdmin] = React.useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    adminScope: 'verification' as NonNullable<UserItem['adminScope']>,
  });

  const fetchAll = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [ridesData, usersData] = await Promise.all([
        apiRequest<RideItem[]>('/admin/rides', { token }),
        apiRequest<UserItem[]>('/admin/users', { token }),
      ]);
      setRides(ridesData);
      setUsers(usersData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load users and rides.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const setRole = async (userId: string, role: UserItem['role']) => {
    try {
      await apiRequest(`/admin/users/${userId}/role`, {
        method: 'PATCH',
        token,
        body: { role },
      });
      await fetchAll();
    } catch (err: any) {
      alert(err?.message || 'Unable to update role');
    }
  };

  const setAdminScope = async (userId: string, adminScope: NonNullable<UserItem['adminScope']>) => {
    try {
      await apiRequest(`/admin/users/${userId}/admin-scope`, {
        method: 'PATCH',
        token,
        body: { adminScope },
      });
      await fetchAll();
    } catch (err: any) {
      alert(err?.message || 'Unable to update admin scope');
    }
  };

  const createSubAdmin = async () => {
    if (!newAdmin.email.trim() || !newAdmin.password.trim()) {
      alert('Email and password are required');
      return;
    }
    try {
      await apiRequest('/admin/team/admins', {
        method: 'POST',
        token,
        body: {
          firstName: newAdmin.firstName.trim(),
          lastName: newAdmin.lastName.trim(),
          email: newAdmin.email.trim(),
          password: newAdmin.password,
          adminScope: newAdmin.adminScope,
        },
      });
      setNewAdmin({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        adminScope: 'verification',
      });
      await fetchAll();
      alert('Sub-admin created successfully');
    } catch (err: any) {
      alert(err?.message || 'Unable to create sub-admin');
    }
  };

  const userFiltered = users.filter((user) => {
    if (tab === 'passengers' && user.role !== 'passenger') return false;
    if (tab === 'drivers' && user.role !== 'driver') return false;
    if (tab === 'team' && user.role !== 'admin') return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      user.email.toLowerCase().includes(q) ||
      `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().includes(q) ||
      user.id.toLowerCase().includes(q)
    );
  });

  const rideFiltered = rides.filter((ride) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      ride.id.toLowerCase().includes(q) ||
      ride.origin.toLowerCase().includes(q) ||
      ride.destination.toLowerCase().includes(q) ||
      ride.driverName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Users & Rides</h1>
        <p className="text-gray-500 mt-1">Live operations data with role management controls.</p>
      </div>

      <div className="flex gap-4 border-b border-gray-200">
        <button onClick={() => setTab('rides')} className={`px-4 py-3 text-sm font-medium ${tab === 'rides' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}>All Rides</button>
        <button onClick={() => setTab('passengers')} className={`px-4 py-3 text-sm font-medium ${tab === 'passengers' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}>Passenger Users</button>
        <button onClick={() => setTab('drivers')} className={`px-4 py-3 text-sm font-medium ${tab === 'drivers' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}>Driver Users</button>
        <button onClick={() => setTab('team')} className={`px-4 py-3 text-sm font-medium ${tab === 'team' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}>Team Roles</button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {tab === 'team' ? (
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Create Sub-Admin</h4>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
              <input
                placeholder="First name"
                value={newAdmin.firstName}
                onChange={(event) => setNewAdmin((prev) => ({ ...prev, firstName: event.target.value }))}
                disabled={currentAdmin?.adminScope !== 'super_admin'}
                className="border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white"
              />
              <input
                placeholder="Last name"
                value={newAdmin.lastName}
                onChange={(event) => setNewAdmin((prev) => ({ ...prev, lastName: event.target.value }))}
                disabled={currentAdmin?.adminScope !== 'super_admin'}
                className="border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white"
              />
              <input
                placeholder="Email"
                value={newAdmin.email}
                onChange={(event) => setNewAdmin((prev) => ({ ...prev, email: event.target.value }))}
                disabled={currentAdmin?.adminScope !== 'super_admin'}
                className="border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white"
              />
              <input
                placeholder="Password"
                value={newAdmin.password}
                onChange={(event) => setNewAdmin((prev) => ({ ...prev, password: event.target.value }))}
                disabled={currentAdmin?.adminScope !== 'super_admin'}
                className="border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white"
              />
              <select
                value={newAdmin.adminScope}
                onChange={(event) => setNewAdmin((prev) => ({ ...prev, adminScope: event.target.value as NonNullable<UserItem['adminScope']> }))}
                disabled={currentAdmin?.adminScope !== 'super_admin'}
                className="border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white"
              >
                <option value="verification">Verification</option>
                <option value="support">Support</option>
                <option value="operations">Operations</option>
              </select>
              <button
                onClick={createSubAdmin}
                disabled={currentAdmin?.adminScope !== 'super_admin'}
                className="bg-emerald-600 text-white rounded-lg px-3 py-2 text-sm disabled:opacity-50"
              >
                Add Admin
              </button>
            </div>
            {currentAdmin?.adminScope !== 'super_admin' ? (
              <p className="text-xs text-amber-700 mt-2">Only super admin can add or manage admin roles.</p>
            ) : null}
          </div>
        ) : null}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-semibold text-gray-900">{tab === 'rides' ? 'Recent Rides' : 'User Directory'}</h3>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={tab === 'rides' ? 'Search rides...' : 'Search users...'}
              className="pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm w-64"
            />
          </div>
        </div>

        {loading ? <p className="p-4 text-sm text-gray-500">Loading...</p> : null}
        {error ? <p className="p-4 text-sm text-red-600">{error}</p> : null}

        {!loading && tab === 'rides' ? (
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 border-b border-gray-100">
                <th className="p-4 font-medium">Ride ID</th>
                <th className="p-4 font-medium">Route</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Driver</th>
                <th className="p-4 font-medium">GMV / Cut</th>
                <th className="p-4 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rideFiltered.map((ride) => (
                <tr key={ride.id} className="hover:bg-gray-50/50">
                  <td className="p-4 font-mono text-xs text-gray-500">{ride.id}</td>
                  <td className="p-4">
                    <span className="font-medium text-gray-900">{ride.origin}</span>
                    <span className="mx-2 text-gray-400">→</span>
                    <span className="font-medium text-gray-900">{ride.destination}</span>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                      {ride.status}
                    </span>
                  </td>
                  <td className="p-4 text-gray-600">{ride.driverName}</td>
                  <td className="p-4">
                    <div className="text-gray-900 font-medium">₦{Number(ride.gmv || 0).toLocaleString()}</div>
                    <div className="text-xs text-gray-500">Platform: ₦{Number(ride.platformCut || 0).toLocaleString()}</div>
                  </td>
                  <td className="p-4 text-gray-500">{ride.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        {!loading && tab !== 'rides' ? (
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 border-b border-gray-100">
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Email</th>
                <th className="p-4 font-medium">Current Role</th>
                <th className="p-4 font-medium">Verification</th>
                <th className="p-4 font-medium text-right">Assign Role</th>
                <th className="p-4 font-medium text-right">Admin Scope</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {userFiltered.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/50">
                  <td className="p-4 text-gray-900">{`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unnamed user'}</td>
                  <td className="p-4 text-gray-600">{user.email}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4 text-gray-600">{user.verificationStatus || '-'}</td>
                  <td className="p-4 text-right">
                    <select
                      value={user.role}
                      onChange={(event) => setRole(user.id, event.target.value as UserItem['role'])}
                      disabled={currentAdmin?.adminScope !== 'super_admin'}
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white"
                    >
                      <option value="passenger">Passenger</option>
                      <option value="driver">Driver</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="p-4 text-right">
                    <select
                      value={user.adminScope || 'none'}
                      onChange={(event) => setAdminScope(user.id, event.target.value as NonNullable<UserItem['adminScope']>)}
                      disabled={currentAdmin?.adminScope !== 'super_admin' || user.role !== 'admin'}
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white"
                    >
                      <option value="none">None</option>
                      <option value="verification">Verification</option>
                      <option value="support">Support</option>
                      <option value="operations">Operations</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </div>
  );
}
