import React, { useState } from 'react';
import { CheckCircle, XCircle, Search, FileText } from 'lucide-react';

const INITIAL_DRIVERS = [
  { id: 'usr_1', name: 'John Doe', status: 'pending', license: 'DF-9823-1', uploaded: '2026-03-24' },
  { id: 'usr_2', name: 'Althea James', status: 'pending', license: 'NG-1920-5', uploaded: '2026-03-23' },
  { id: 'usr_3', name: 'Michael Olu', status: 'pending', license: 'ABJ-3841-9', uploaded: '2026-03-23' },
];

export default function Drivers() {
  const [drivers, setDrivers] = useState(INITIAL_DRIVERS);

  const handleApprove = (id: string) => {
    setDrivers(drivers.filter(d => d.id !== id));
    // Implementation would call PATCH /users/:id/verification with status: 'approved'
  };

  const handleReject = (id: string) => {
    setDrivers(drivers.filter(d => d.id !== id));
    // Implementation would call PATCH /users/:id/verification with status: 'rejected'
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Drivers Verification</h1>
          <p className="text-gray-500 mt-1">Review and approve driver licenses and documents.</p>
        </div>
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search drivers..." 
            className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64 shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm font-medium text-gray-500">
                <th className="p-4 pl-6">Driver Name</th>
                <th className="p-4">License / ID Number</th>
                <th className="p-4">Submitted Date</th>
                <th className="p-4">Documents</th>
                <th className="p-4 text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {drivers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    No drivers pending verification. Great job!
                  </td>
                </tr>
              ) : drivers.map(driver => (
                <tr key={driver.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 pl-6 font-medium text-gray-900">{driver.name}</td>
                  <td className="p-4 text-gray-600 font-mono text-xs">{driver.license}</td>
                  <td className="p-4 text-gray-500">{driver.uploaded}</td>
                  <td className="p-4">
                    <button className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 font-medium">
                      <FileText className="w-4 h-4" />
                      View Files
                    </button>
                  </td>
                  <td className="p-4 pr-6 flex justify-end gap-2">
                    <button 
                      onClick={() => handleReject(driver.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                      title="Reject"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleApprove(driver.id)}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-100"
                      title="Approve"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
