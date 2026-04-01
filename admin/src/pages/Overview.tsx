import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import { CarFront, DollarSign, Route, Users, Activity, TrendingUp } from 'lucide-react';
import { apiRequest } from '../lib/api.ts';
import { useAuth } from '../lib/auth.tsx';

export default function Overview() {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [statsData, setStatsData] = React.useState({
    gmv: 0,
    arr: 0,
    totalRides: 0,
    totalUsers: 0,
    totalDrivers: 0,
    activeUsers: 0,
    activeUsersBreakdown: {
      realtimePresence: 0,
      availableDrivers: 0,
      businessActivity: 0,
      presenceWindowMinutes: 15,
      activityWindowHours: 24,
    },
  });
  const [revData, setRevData] = React.useState<Array<{ name: string; gmv: number; revenue: number }>>([]);
  const [cityData, setCityData] = React.useState<Array<{ name: string; rides: number; trendScore: number; rides24h: number; growthRate: number }>>([]);
  const [leavingData, setLeavingData] = React.useState<Array<{ name: string; rides: number }>>([]);
  const [arrivingData, setArrivingData] = React.useState<Array<{ name: string; rides: number }>>([]);
  const [lastUpdated, setLastUpdated] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setIsLoading(true);
        const data = await apiRequest<{
          stats: {
            gmv: number;
            arr: number;
            totalRides: number;
            totalUsers: number;
            totalDrivers: number;
            activeUsers: number;
            activeUsersBreakdown?: {
              realtimePresence: number;
              availableDrivers: number;
              businessActivity: number;
              presenceWindowMinutes: number;
              activityWindowHours: number;
            };
          };
          revenueSeries: Array<{ name: string; gmv: number; revenue: number }>;
          cityVolumes: Array<{ name: string; rides: number; trendScore?: number; rides24h?: number; growthRate?: number }>;
          trendingAreas?: Array<{ name: string; rides: number; rides24h: number; rides7d: number; growthRate: number; trendScore: number }>;
          topLeavingAreas?: Array<{ name: string; rides: number }>;
          topArrivingAreas?: Array<{ name: string; rides: number }>;
          generatedAt: string;
        }>('/admin/analytics/overview', { token });
        if (mounted) {
          setStatsData({
            ...data.stats,
            activeUsersBreakdown: data.stats.activeUsersBreakdown || {
              realtimePresence: 0,
              availableDrivers: 0,
              businessActivity: 0,
              presenceWindowMinutes: 15,
              activityWindowHours: 24,
            },
          });
          setRevData(data.revenueSeries || []);
          const trending = data.trendingAreas || [];
          if (trending.length > 0) {
            setCityData(trending.map((area) => ({
              name: area.name,
              rides: area.rides7d,
              trendScore: area.trendScore,
              rides24h: area.rides24h,
              growthRate: area.growthRate,
            })));
          } else {
            setCityData((data.cityVolumes || []).map((area) => ({
              name: area.name,
              rides: area.rides,
              trendScore: Number(area.trendScore || area.rides || 0),
              rides24h: Number(area.rides24h || 0),
              growthRate: Number(area.growthRate || 0),
            })));
          }
          setLeavingData(data.topLeavingAreas || []);
          setArrivingData(data.topArrivingAreas || []);
          setLastUpdated(data.generatedAt);
          setError(null);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.message || 'Failed to fetch dashboard stats.');
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    run();
    const interval = setInterval(run, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [token]);

  const stats = [
    { label: 'Gross Merchandise Value (YTD)', value: `₦${Number(statsData.gmv || 0).toLocaleString()}`, icon: DollarSign, trend: 'Live' },
    { label: 'Annual Recurring Revenue (ARR)', value: `₦${Number(statsData.arr || 0).toLocaleString()}`, icon: TrendingUp, trend: 'Live' },
    { label: 'Total Rides', value: Number(statsData.totalRides || 0).toLocaleString(), icon: Route, trend: 'Live' },
    { label: 'Total Users', value: Number(statsData.totalUsers || 0).toLocaleString(), icon: Users, trend: 'Live' },
    { label: 'Total Drivers', value: Number(statsData.totalDrivers || 0).toLocaleString(), icon: CarFront, trend: 'Live' },
    {
      label: 'Active Users',
      value: Number(statsData.activeUsers || 0).toLocaleString(),
      icon: Activity,
      trend: `Presence ${Number(statsData.activeUsersBreakdown?.realtimePresence || 0).toLocaleString()} • Available ${Number(statsData.activeUsersBreakdown?.availableDrivers || 0).toLocaleString()} • Activity ${Number(statsData.activeUsersBreakdown?.businessActivity || 0).toLocaleString()}`,
    },
  ];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-500 mt-1">Platform metrics and financial performance.</p>
        {lastUpdated ? <p className="text-xs text-gray-400 mt-1">Updated: {new Date(lastUpdated).toLocaleString()}</p> : null}
        {error ? <p className="text-sm text-red-600 mt-2">{error}</p> : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{stat.label}</p>
                <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
              </div>
              <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm font-medium text-emerald-600">
              {isLoading ? 'Refreshing...' : stat.trend}
              <span className="text-gray-400 font-normal ml-2">{isLoading ? 'please wait' : 'from backend'}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Revenue Growth (Platform Cut)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} tickFormatter={(v) => `₦${v/1000}k`} />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                <Line type="monotone" dataKey="gmv" stroke="#94a3b8" strokeWidth={3} dot={false} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Top Trending Areas (7d)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#111827', fontWeight: 500}} width={100} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="trendScore" fill="#10b981" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Top Leaving Cities</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leavingData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#111827', fontWeight: 500}} width={110} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="rides" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Top Arriving Cities</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={arrivingData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#111827', fontWeight: 500}} width={110} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="rides" fill="#10b981" radius={[0, 4, 4, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
