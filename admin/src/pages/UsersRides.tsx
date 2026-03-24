import React from 'react';
import { Search } from 'lucide-react';

export default function UsersRides() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Users & Rides</h1>
        <p className="text-gray-500 mt-1">Manage platform participants and internal ride logs.</p>
      </div>

      <div className="flex gap-4 border-b border-gray-200">
        <button className="px-4 py-3 text-sm font-medium text-emerald-600 border-b-2 border-emerald-600">All Rides</button>
        <button className="px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700">Passenger Users</button>
        <button className="px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700">Driver Users</button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-semibold text-gray-900">Recent Rides</h3>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by ID or location..." 
              className="pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm w-64"
            />
          </div>
        </div>
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
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} className="hover:bg-gray-50/50">
                <td className="p-4 font-mono text-xs text-gray-500">EDR-{i}928A</td>
                <td className="p-4">
                  <span className="font-medium text-gray-900">Lagos</span>
                  <span className="mx-2 text-gray-400">→</span>
                  <span className="font-medium text-gray-900">Abuja</span>
                </td>
                <td className="p-4">
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                    Completed
                  </span>
                </td>
                <td className="p-4 text-gray-600">John Doe</td>
                <td className="p-4">
                  <div className="text-gray-900 font-medium">₦15,000</div>
                  <div className="text-xs text-gray-500">Platform: ₦3,750</div>
                </td>
                <td className="p-4 text-gray-500">Mar 24, 2026</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
