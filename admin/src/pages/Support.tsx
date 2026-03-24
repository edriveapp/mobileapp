import React from 'react';
import { MessageSquare, AlertCircle } from 'lucide-react';

export default function Support() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Customer Support</h1>
        <p className="text-gray-500 mt-1">Manage user disputes, emergency alerts, and direct queries.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 border border-gray-200 rounded-2xl bg-white overflow-hidden shadow-sm flex flex-col h-[600px]">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-semibold text-gray-900">Active Tickets</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {[1, 2, 3].map((ticket) => (
              <button key={ticket} className={`w-full text-left p-3 rounded-xl transition-colors ${ticket === 1 ? 'bg-emerald-50 border border-emerald-100/50' : 'hover:bg-gray-50 border border-transparent'}`}>
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-sm text-gray-900">Lost Item Report</span>
                  <span className="text-xs text-gray-400">10m ago</span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-1">Passenger reported leaving a black backpack in ride EDR-192A...</p>
                <div className="mt-2 flex gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">High</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">#10{ticket}4</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 border border-gray-200 rounded-2xl bg-white shadow-sm flex flex-col h-[600px]">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-gray-900">Ticket #1014</h3>
              <p className="text-xs text-gray-500">Reported by Sarah J. (Rider)</p>
            </div>
            <button className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors">
              Resolve Ticket
            </button>
          </div>
          
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            <div className="flex justify-center">
              <span className="text-xs text-gray-400 font-medium bg-gray-50 px-3 py-1 rounded-full">Today, 10:42 AM</span>
            </div>
            
            <div className="flex gap-3 max-w-[80%]">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0" />
              <div className="bg-gray-100 p-4 rounded-2xl rounded-tl-none">
                <p className="text-sm text-gray-800">Hi, I left my black backpack in the backseat of John's car this morning. Can you help me contact him?</p>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="bg-amber-50 border border-amber-100 px-4 py-2 rounded-lg flex items-center gap-2 text-sm text-amber-800 max-w-sm text-center">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>System: Ride EDR-192A ended 2 hours ago. Driver phone is available.</span>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <div className="relative">
              <input type="text" placeholder="Type a reply to Sarah..." className="w-full bg-white border border-gray-200 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm" />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors">
                <MessageSquare className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
