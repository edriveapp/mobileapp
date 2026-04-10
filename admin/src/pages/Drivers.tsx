import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle, XCircle, Search, FileText,
  AlertTriangle, Shield, ShieldOff, Eye, X,
} from 'lucide-react';
import { apiRequest } from '../lib/api.ts';
import { useAuth } from '../lib/auth.tsx';

// ─── Types ──────────────────────────────────────────────────────────────────

type PendingDriver = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  createdAt: string;
  isRestricted?: boolean;
  rating?: number;
  verificationStatus?: string;
  driverProfile?: {
    onboardingMeta?: { nin?: string; guarantorName?: string; guarantorPhone?: string };
    vehicleDetails?: {
      insuranceDocumentUrl?: string;
      worthinessCertificateUrl?: string;
      vehiclePhotoUrls?: string[];
    };
    licenseDetails?: { number?: string; documentUrl?: string };
  };
};

type DriverDetail = {
  driver: PendingDriver;
  stats: { totalRides: number; completedRides: number; totalEarnings: number; averageRating: number };
  rides: { id: string; origin: string; destination: string; status: string; fare: number; date: string }[];
  reviews: { id: string; rating: number; comment: string; raterName: string; date: string }[];
  warnings: { id: string; level: string; reason: string; issuedBy: string; date: string }[];
};

const WARNING_LEVELS = ['minor', 'major', 'final'];
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  unverified: 'bg-gray-100 text-gray-600 border-gray-200',
};
const WARNING_COLORS: Record<string, string> = {
  minor: 'bg-yellow-50 text-yellow-700',
  major: 'bg-orange-50 text-orange-700',
  final: 'bg-red-50 text-red-700',
};

// ─── Driver Detail Modal ─────────────────────────────────────────────────────

function DriverDetailModal({
  driverId,
  onClose,
  token,
  onRestrictionChange,
}: {
  driverId: string;
  onClose: () => void;
  token: string | null;
  onRestrictionChange: (id: string, restricted: boolean) => void;
}) {
  const [detail, setDetail] = useState<DriverDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'rides' | 'reviews' | 'warnings'>('overview');
  const [warnOpen, setWarnOpen] = useState(false);
  const [warnLevel, setWarnLevel] = useState('minor');
  const [warnReason, setWarnReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiRequest<DriverDetail>(`/admin/drivers/${driverId}`, { token })
      .then(setDetail)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [driverId, token]);

  const handleWarn = async () => {
    if (!warnReason.trim()) return;
    setSubmitting(true);
    try {
      await apiRequest(`/admin/drivers/${driverId}/warn`, {
        method: 'POST', token, body: { level: warnLevel, reason: warnReason },
      });
      setWarnReason('');
      setWarnOpen(false);
      // Re-fetch
      const updated = await apiRequest<DriverDetail>(`/admin/drivers/${driverId}`, { token });
      setDetail(updated);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestrict = async (restrict: boolean) => {
    if (!detail) return;
    try {
      await apiRequest(`/admin/drivers/${driverId}/restrict`, {
        method: 'POST', token, body: { restrict },
      });
      setDetail({ ...detail, driver: { ...detail.driver, isRestricted: restrict } });
      onRestrictionChange(driverId, restrict);
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 text-gray-500">Loading driver details…</div>
      </div>
    );
  }
  if (!detail) return null;

  const { driver, stats, rides, reviews, warnings } = detail;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xl">
              {(driver.firstName?.[0] || driver.email[0]).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{driver.firstName} {driver.lastName}</h2>
              <p className="text-sm text-gray-500">{driver.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[driver.verificationStatus || 'unverified']}`}>
                  {driver.verificationStatus || 'unverified'}
                </span>
                {driver.isRestricted && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 font-medium">
                    🔒 Restricted
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-0 border-b border-gray-100">
          {[
            { label: 'Total Rides', value: stats.totalRides },
            { label: 'Completed', value: stats.completedRides },
            { label: 'Earnings', value: `₦${stats.totalEarnings.toLocaleString()}` },
            { label: 'Avg Rating', value: `${stats.averageRating?.toFixed(1)} ★` },
          ].map(({ label, value }) => (
            <div key={label} className="p-4 border-r border-gray-100 last:border-r-0 text-center">
              <div className="text-lg font-bold text-gray-900">{value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          {(['overview', 'rides', 'reviews', 'warnings'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                tab === t ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t} {t === 'warnings' && warnings.length > 0 && <span className="ml-1 text-red-500">({warnings.length})</span>}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'overview' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Driver Documents</h3>
              <div className="flex flex-col gap-2">
                {driver.driverProfile?.licenseDetails?.documentUrl && (
                  driver.driverProfile.licenseDetails.documentUrl.startsWith('file://') ? (
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100 italic">
                      ⚠️ Data corrupted: Local URI (re-onboarding required)
                    </span>
                  ) : (
                    <a href={driver.driverProfile.licenseDetails.documentUrl} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 text-sm font-medium">
                      <FileText className="w-4 h-4" /> View License
                    </a>
                  )
                )}
                {driver.driverProfile?.vehicleDetails?.insuranceDocumentUrl && (
                   driver.driverProfile.vehicleDetails.insuranceDocumentUrl.startsWith('file://') ? null : (
                    <a href={driver.driverProfile.vehicleDetails.insuranceDocumentUrl} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 text-sm font-medium">
                      <FileText className="w-4 h-4" /> View Insurance
                    </a>
                  )
                )}
                {driver.driverProfile?.vehicleDetails?.worthinessCertificateUrl && (
                  driver.driverProfile.vehicleDetails.worthinessCertificateUrl.startsWith('file://') ? null : (
                    <a href={driver.driverProfile.vehicleDetails.worthinessCertificateUrl} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 text-sm font-medium">
                      <FileText className="w-4 h-4" /> Worthiness Certificate
                    </a>
                  )
                )}
                {(driver.driverProfile?.vehicleDetails?.vehiclePhotoUrls || []).map((url, i) => (
                  url.startsWith('file://') ? null : (
                    <a key={url} href={url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 text-sm font-medium">
                      <FileText className="w-4 h-4" /> Vehicle Photo {i + 1}
                    </a>
                  )
                ))}
              </div>
              <div className="mt-4">
                <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-2">NIN & Guarantor</h3>
                <p className="text-sm text-gray-600">NIN: {driver.driverProfile?.onboardingMeta?.nin || 'N/A'}</p>
                <p className="text-sm text-gray-600">Guarantor: {driver.driverProfile?.onboardingMeta?.guarantorName || 'N/A'}</p>
              </div>
            </div>
          )}

          {tab === 'rides' && (
            <div className="space-y-2">
              {rides.length === 0 && <p className="text-gray-400 text-sm">No rides yet.</p>}
              {rides.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm">
                    <p className="font-medium text-gray-800">{r.origin} → {r.destination}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{r.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">₦{r.fare.toLocaleString()}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>{r.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'reviews' && (
            <div className="space-y-3">
              {reviews.length === 0 && <p className="text-gray-400 text-sm">No reviews yet.</p>}
              {reviews.map((rv) => (
                <div key={rv.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-800">{rv.raterName}</span>
                    <span className="flex items-center gap-1 text-amber-500 text-sm font-semibold">
                      {'★'.repeat(rv.rating)}{'☆'.repeat(5 - rv.rating)}
                    </span>
                  </div>
                  {rv.comment && <p className="text-sm text-gray-500 italic">"{rv.comment}"</p>}
                  <p className="text-xs text-gray-400 mt-1">{rv.date}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'warnings' && (
            <div className="space-y-3">
              {warnings.map((w) => (
                <div key={w.id} className={`p-3 rounded-lg ${WARNING_COLORS[w.level] || 'bg-gray-50 text-gray-700'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="uppercase text-xs font-bold tracking-wide">{w.level} Warning</span>
                    <span className="text-xs opacity-70">{w.date}</span>
                  </div>
                  <p className="text-sm">{w.reason}</p>
                  <p className="text-xs opacity-60 mt-1">By: {w.issuedBy}</p>
                </div>
              ))}
              {warnings.length === 0 && <p className="text-gray-400 text-sm">No warnings issued.</p>}
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="p-4 border-t border-gray-100 flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setWarnOpen(!warnOpen)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            Issue Warning
          </button>
          {driver.isRestricted ? (
            <button
              onClick={() => handleRestrict(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
            >
              <Shield className="w-4 h-4" />
              Reinstate Account
            </button>
          ) : (
            <button
              onClick={() => handleRestrict(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
            >
              <ShieldOff className="w-4 h-4" />
              Restrict Account
            </button>
          )}
        </div>

        {/* Warn Drawer */}
        {warnOpen && (
          <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-3">
            <div className="flex gap-2">
              {WARNING_LEVELS.map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setWarnLevel(lvl)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${
                    warnLevel === lvl ? WARNING_COLORS[lvl] + ' ring-1 ring-current' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
            <textarea
              rows={3}
              value={warnReason}
              onChange={(e) => setWarnReason(e.target.value)}
              placeholder="Describe the reason for this warning…"
              className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
            <div className="flex gap-2">
              <button
                disabled={submitting || !warnReason.trim()}
                onClick={handleWarn}
                className="px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Sending…' : 'Send Warning'}
              </button>
              <button onClick={() => setWarnOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Drivers + Verification Page ────────────────────────────────────────

export default function Drivers() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [drivers, setDrivers] = useState<PendingDriver[]>([]);
  const [allDrivers, setAllDrivers] = useState<PendingDriver[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pending, all] = await Promise.all([
        apiRequest<PendingDriver[]>('/admin/drivers/pending', { token }),
        apiRequest<PendingDriver[]>('/admin/drivers', { token }),
      ]);
      setDrivers(pending);
      setAllDrivers(all);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch drivers');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleApprove = async (id: string) => {
    try {
      await apiRequest(`/admin/users/${id}/verify`, { method: 'POST', token, body: { status: 'approved' } });
      setDrivers(drivers.filter((d) => d.id !== id));
      loadAll();
    } catch (err: any) { alert(err?.message || 'Failed to approve driver'); }
  };

  const handleReject = async (id: string) => {
    try {
      await apiRequest(`/admin/users/${id}/verify`, { method: 'POST', token, body: { status: 'rejected' } });
      setDrivers(drivers.filter((d) => d.id !== id));
    } catch (err: any) { alert(err?.message || 'Failed to reject driver'); }
  };

  const handleRestrictionChange = (id: string, restricted: boolean) => {
    setAllDrivers((prev) => prev.map((d) => d.id === id ? { ...d, isRestricted: restricted } : d));
  };

  const activeList = activeTab === 'pending' ? drivers : allDrivers;
  const filtered = activeList.filter((d) => {
    const q = search.toLowerCase();
    return !q || `${d.firstName || ''} ${d.lastName || ''}`.toLowerCase().includes(q) || d.email.toLowerCase().includes(q);
  });

  return (
    <div className="p-8 space-y-6">
      {selectedDriverId && (
        <DriverDetailModal
          driverId={selectedDriverId}
          onClose={() => setSelectedDriverId(null)}
          token={token}
          onRestrictionChange={handleRestrictionChange}
        />
      )}

      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Driver Management</h1>
          <p className="text-gray-500 mt-1">Review, verify, warn and manage drivers on the platform.</p>
        </div>
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search drivers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64 shadow-sm"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {([['pending', 'Pending Verification'], ['all', 'All Drivers']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
            {key === 'pending' && drivers.length > 0 && (
              <span className="ml-2 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5">{drivers.length}</span>
            )}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-gray-500">Loading drivers…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm font-medium text-gray-500">
                <th className="p-4 pl-6">Driver</th>
                {activeTab === 'all' && <th className="p-4">Status</th>}
                <th className="p-4">License No.</th>
                <th className="p-4">NIN / Guarantor</th>
                <th className="p-4">Joined</th>
                <th className="p-4">Documents</th>
                <th className="p-4 text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    {activeTab === 'pending' ? 'No drivers pending verification. Great job!' : 'No drivers found.'}
                  </td>
                </tr>
              ) : filtered.map((driver) => (
                <tr key={driver.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="p-4 pl-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm shrink-0">
                        {(driver.firstName?.[0] || driver.email[0]).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{driver.firstName} {driver.lastName}</p>
                        <p className="text-xs text-gray-400">{driver.email}</p>
                      </div>
                    </div>
                  </td>
                  {activeTab === 'all' && (
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium w-fit ${STATUS_COLORS[driver.verificationStatus || 'unverified']}`}>
                          {driver.verificationStatus || 'unverified'}
                        </span>
                        {driver.isRestricted && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 font-medium w-fit">
                            🔒 Restricted
                          </span>
                        )}
                      </div>
                    </td>
                  )}
                  <td className="p-4 text-gray-600 font-mono text-xs">{driver.driverProfile?.licenseDetails?.number || 'N/A'}</td>
                  <td className="p-4 text-xs text-gray-500">
                    <div>NIN: {driver.driverProfile?.onboardingMeta?.nin || 'N/A'}</div>
                    <div>{driver.driverProfile?.onboardingMeta?.guarantorName || 'N/A'}</div>
                  </td>
                  <td className="p-4 text-gray-500">{new Date(driver.createdAt).toLocaleDateString()}</td>
                  <td className="p-4 text-xs">
                    <div className="flex flex-col gap-1">
                      {driver.driverProfile?.licenseDetails?.documentUrl && (
                        <a href={driver.driverProfile.licenseDetails.documentUrl} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium">
                          <FileText className="w-3.5 h-3.5" /> License
                        </a>
                      )}
                      {driver.driverProfile?.vehicleDetails?.insuranceDocumentUrl && (
                        <a href={driver.driverProfile.vehicleDetails.insuranceDocumentUrl} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium">
                          <FileText className="w-3.5 h-3.5" /> Insurance
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="p-4 pr-6">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setSelectedDriverId(driver.id)}
                        className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {activeTab === 'pending' && (
                        <>
                          <button onClick={() => handleReject(driver.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Reject">
                            <XCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleApprove(driver.id)}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Approve">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
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
