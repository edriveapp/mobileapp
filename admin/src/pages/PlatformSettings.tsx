import { useEffect, useState } from 'react';
import { Percent, Save, CheckCircle, Settings as SettingsIcon, Banknote, Navigation, XCircle } from 'lucide-react';
import { apiRequest } from '../lib/api.ts';
import { useAuth } from '../lib/auth.tsx';

export default function PlatformSettings() {
  const { token } = useAuth();
  const [settings, setSettings] = useState({
    platformCutPercent: 15,
    baseFare: 500,
    minimumFare: 1000,
    surgeMultiplier: 1.0,
    cancellationFee: 500,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<typeof settings>('/admin/settings', { token })
      .then((data) => setSettings(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const result = await apiRequest<typeof settings>('/admin/settings', {
        method: 'PATCH',
        token,
        body: settings,
      });
      setSettings(result);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: keyof typeof settings, value: number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto pb-24">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
        <p className="text-gray-500 mt-1">Configure global platform behaviour and financial parameters.</p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading settings…</p>
      ) : (
        <div className="space-y-6">
          {/* Commission Cut Section */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
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
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Commission Rate</label>
                  <span className="text-2xl font-bold text-emerald-600">{settings.platformCutPercent}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={0.5}
                  value={settings.platformCutPercent}
                  onChange={(e) => handleChange('platformCutPercent', Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Or enter exact value</label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={settings.platformCutPercent}
                    onChange={(e) => handleChange('platformCutPercent', Math.min(100, Math.max(0, Number(e.target.value))))}
                    className="w-full border border-gray-200 rounded-xl pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Config Section */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-2">
            <div className="px-6 py-6 border-b md:border-b-0 md:border-r border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Banknote className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Base Fare (₦)</h3>
              </div>
              <p className="text-xs text-gray-500 mb-3">The starting price for any ride before distance/time is calculated.</p>
              <input
                type="number"
                min={0}
                step={50}
                value={settings.baseFare}
                onChange={(e) => handleChange('baseFare', Math.max(0, Number(e.target.value)))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div className="px-6 py-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <Navigation className="w-4 h-4 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Minimum Fare (₦)</h3>
              </div>
              <p className="text-xs text-gray-500 mb-3">The absolute lowest price a ride can cost, overriding other calculations.</p>
              <input
                type="number"
                min={0}
                step={100}
                value={settings.minimumFare}
                onChange={(e) => handleChange('minimumFare', Math.max(0, Number(e.target.value)))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div className="px-6 py-6 border-t border-gray-100 md:border-r">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                  <SettingsIcon className="w-4 h-4 text-orange-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Global Surge Multiplier</h3>
              </div>
              <p className="text-xs text-gray-500 mb-3">Multiplier applied to all ride requests (e.g. 1.5 for 50% increase).</p>
              <input
                type="number"
                min={1}
                max={5}
                step={0.1}
                value={settings.surgeMultiplier}
                onChange={(e) => handleChange('surgeMultiplier', Math.max(1, Number(e.target.value)))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div className="px-6 py-6 border-t border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                  <XCircle className="w-4 h-4 text-red-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Cancellation Fee (₦)</h3>
              </div>
              <p className="text-xs text-gray-500 mb-3">Flat fee charged for late rider cancellations.</p>
              <input
                type="number"
                min={0}
                step={100}
                value={settings.cancellationFee}
                onChange={(e) => handleChange('cancellationFee', Math.max(0, Number(e.target.value)))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-60 shadow-md hover:shadow-lg"
          >
            {saved ? (
              <><CheckCircle className="w-5 h-5" /> All Settings Saved!</>
            ) : saving ? (
              'Saving…'
            ) : (
              <><Save className="w-5 h-5" /> Save Changes</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
