import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';
import { DollarSign, Route, Users, TrendingUp } from 'lucide-react';

const revData = [
  { name: 'Jan', gmv: 4000, revenue: 1000 },
  { name: 'Feb', gmv: 5500, revenue: 1375 },
  { name: 'Mar', gmv: 6200, revenue: 1550 },
  { name: 'Apr', gmv: 8100, revenue: 2025 },
  { name: 'May', gmv: 9500, revenue: 2375 },
  { name: 'Jun', gmv: 12000, revenue: 3000 },
];

const cityData = [
  { name: 'Lagos', rides: 400 },
  { name: 'Abuja', rides: 300 },
  { name: 'Port Harcourt', rides: 200 },
  { name: 'Kano', rides: 80 },
];

export default function Overview() {
  const stats = [
    { label: 'Gross Merchandise Value (YTD)', value: '₦4,850,000', icon: DollarSign, trend: '+14%' },
    { label: 'Annual Recurring Revenue (ARR)', value: '₦1,210,000', icon: TrendingUp, trend: '+22%' },
    { label: 'Total Rides Completed', value: '1,432', icon: Route, trend: '+8%' },
    { label: 'Active Users', value: '4,102', icon: Users, trend: '+5%' },
  ];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-500 mt-1">Platform metrics and financial performance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              {stat.trend} <span className="text-gray-400 font-normal ml-2">vs last month</span>
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
          <h3 className="text-lg font-bold text-gray-900 mb-6">Top Cities by Volume</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#111827', fontWeight: 500}} width={100} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="rides" fill="#10b981" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
