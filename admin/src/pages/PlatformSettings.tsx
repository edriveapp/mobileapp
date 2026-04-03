import { useEffect, useState } from 'react';
import { Percent, Save, CheckCircle } from 'lucide-react';
import { apiRequest } from '../lib/api.ts';
import { useAuth } from '../lib/auth.tsx';

export default function PlatformSettings() {
  const { token } = useAuth();
  const [cutPercent, setCutPercent] = useState<number>(15);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<{ platformCutPercent: number }>('/admin/settings', { token })
      .then((data) => setCutPercent(data.platformCutPercent))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const result = await apiRequest<{ platformCutPercent: number }>('/admin/settings', {
        method: 'PATCH',
        token,
        body: { platformCutPercent: cutPercent },
      });
      setCutPercent(result.platformCutPercent);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
        <p className="text-gray-500 mt-1">Configure global platform behaviour and financial parameters.</p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading settings…</p>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Section Header */}
          <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Percent className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Platform Commission Cut</h2>
              <p className="text-sm text-gray-400">Percentage taken from each completed ride fare.</p>
            </div>
          </div>

          <div className="px-6 py-6 space-y-6">
            {/* Slider */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Commission Rate</label>
                <span className="text-2xl font-bold text-emerald-600">{cutPercent}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={50}
                step={0.5}
                value={cutPercent}
                onChange={(e) => setCutPercent(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
              </div>
            </div>

            {/* Manual Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Or enter exact value</label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={cutPercent}
                  onChange={(e) => setCutPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
                  className="w-full border border-gray-200 rounded-xl pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">%</span>
              </div>
            </div>

            {/* Impact Preview */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Example Impact</p>
              <div className="space-y-2">
                {[1000, 3500, 8000].map((fare) => {
                  const cut = ((fare * cutPercent) / 100).toFixed(0);
                  const driver = (fare - Number(cut)).toFixed(0);
                  return (
                    <div key={fare} className="flex justify-between text-sm">
                      <span className="text-gray-500">₦{fare.toLocaleString()} ride</span>
                      <span>
                        <span className="text-red-500 font-medium">-₦{Number(cut).toLocaleString()}</span>
                        <span className="text-gray-400"> platform · </span>
                        <span className="text-emerald-600 font-medium">₦{Number(driver).toLocaleString()}</span>
                        <span className="text-gray-400"> driver</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-60"
            >
              {saved ? (
                <><CheckCircle className="w-4 h-4" /> Saved!</>
              ) : saving ? (
                'Saving…'
              ) : (
                <><Save className="w-4 h-4" /> Save Settings</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
