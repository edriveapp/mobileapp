import React, { useState } from 'react';
import { CheckCircle, XCircle, Search, FileText } from 'lucide-react';
import { apiRequest } from '../lib/api.ts';
import { useAuth } from '../lib/auth.tsx';

type PendingDriver = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  createdAt: string;
  driverProfile?: {
    onboardingMeta?: {
      nin?: string;
      guarantorName?: string;
      guarantorPhone?: string;
      nextOfKinName?: string;
      nextOfKinPhone?: string;
    };
    vehicleDetails?: {
      insuranceDocumentUrl?: string;
      worthinessCertificateUrl?: string;
      vehiclePhotoUrls?: string[];
    };
    licenseDetails?: {
      number?: string;
      documentUrl?: string;
    };
  };
};

export default function Drivers() {
  const { token } = useAuth();
  const [drivers, setDrivers] = useState<PendingDriver[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    fetchDrivers(token);
  }, [token]);

  const fetchDrivers = async (authToken: string | null) => {
    try {
      setError(null);
      const data = await apiRequest<PendingDriver[]>('/admin/drivers/pending', { token: authToken });
      setDrivers(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch drivers');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await apiRequest(`/admin/users/${id}/verify`, {
        method: 'POST',
        token,
        body: { status: 'approved' },
      });
      setDrivers(drivers.filter(d => d.id !== id));
    } catch (err: any) {
      alert(err?.message || 'Failed to approve driver');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await apiRequest(`/admin/users/${id}/verify`, {
        method: 'POST',
        token,
        body: { status: 'rejected' },
      });
      setDrivers(drivers.filter(d => d.id !== id));
    } catch (err: any) {
      alert(err?.message || 'Failed to reject driver');
    }
  };

  const filteredDrivers = drivers.filter((driver) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      `${driver.firstName || ''} ${driver.lastName || ''}`.toLowerCase().includes(q) ||
      driver.email.toLowerCase().includes(q) ||
      (driver.driverProfile?.licenseDetails?.number || '').toLowerCase().includes(q)
    );
  });

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
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64 shadow-sm"
          />
        </div>
      </div>
      {loading ? <p className="text-sm text-gray-500">Loading pending drivers...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm font-medium text-gray-500">
                <th className="p-4 pl-6">Driver Name</th>
                <th className="p-4">License / ID Number</th>
                <th className="p-4">Verification Details</th>
                <th className="p-4">Submitted Date</th>
                <th className="p-4">Documents</th>
                <th className="p-4 text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredDrivers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No drivers pending verification. Great job!
                  </td>
                </tr>
              ) : filteredDrivers.map(driver => (
                <tr key={driver.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 pl-6 font-medium text-gray-900">
                    {driver.firstName} {driver.lastName}
                    <div className="text-xs text-gray-400 font-normal">{driver.email}</div>
                  </td>
                  <td className="p-4 text-gray-600 font-mono text-xs">
                    {driver.driverProfile?.licenseDetails?.number || 'N/A'}
                  </td>
                  <td className="p-4 text-xs text-gray-600">
                    <div>NIN: {driver.driverProfile?.onboardingMeta?.nin || 'N/A'}</div>
                    <div>
                      Guarantor: {driver.driverProfile?.onboardingMeta?.guarantorName || 'N/A'}
                      {driver.driverProfile?.onboardingMeta?.guarantorPhone ? ` (${driver.driverProfile?.onboardingMeta?.guarantorPhone})` : ''}
                    </div>
                  </td>
                  <td className="p-4 text-gray-500">
                    {new Date(driver.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-xs">
                    <div className="flex flex-col gap-1">
                      {driver.driverProfile?.licenseDetails?.documentUrl ? (
                        <a
                          href={driver.driverProfile.licenseDetails.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                          <FileText className="w-4 h-4" />
                          License
                        </a>
                      ) : null}
                      {driver.driverProfile?.vehicleDetails?.insuranceDocumentUrl ? (
                        <a
                          href={driver.driverProfile.vehicleDetails.insuranceDocumentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                          <FileText className="w-4 h-4" />
                          Insurance
                        </a>
                      ) : null}
                      {driver.driverProfile?.vehicleDetails?.worthinessCertificateUrl ? (
                        <a
                          href={driver.driverProfile.vehicleDetails.worthinessCertificateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                          <FileText className="w-4 h-4" />
                          Worthiness
                        </a>
                      ) : null}
                      {(driver.driverProfile?.vehicleDetails?.vehiclePhotoUrls || []).map((url, index) => (
                        <a
                          key={url + index}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                          <FileText className="w-4 h-4" />
                          Vehicle Photo {index + 1}
                        </a>
                      ))}
                      {!driver.driverProfile?.licenseDetails?.documentUrl &&
                      !driver.driverProfile?.vehicleDetails?.insuranceDocumentUrl &&
                      !driver.driverProfile?.vehicleDetails?.worthinessCertificateUrl &&
                      (driver.driverProfile?.vehicleDetails?.vehiclePhotoUrls || []).length === 0 ? (
                        <span className="text-gray-400 italic">No files</span>
                      ) : null}
                    </div>
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
