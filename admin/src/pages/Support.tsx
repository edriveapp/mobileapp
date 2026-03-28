import { AlertCircle, MessageSquare } from 'lucide-react';
import React from 'react';
import { apiRequest } from '../lib/api.ts';
import { useAuth } from '../lib/auth.tsx';

type Ticket = {
  id: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved';
  priority?: string;
  createdByRole: string;
  createdByUserId: string;
  assignedToUserId?: string | null;
  createdAt: string;
  updatedAt: string;
};

type TicketDetails = Ticket & {
  messages: Array<{
    id: string;
    senderId: string;
    senderRole: string;
    text: string;
    createdAt: string;
  }>;
};

export default function Support() {
  const { token, user } = useAuth();
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [activeTicketId, setActiveTicketId] = React.useState<string | null>(null);
  const [activeTicket, setActiveTicket] = React.useState<TicketDetails | null>(null);
  const [reply, setReply] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const loadTickets = React.useCallback(async () => {
    try {
      const data = await apiRequest<Ticket[]>('/support/tickets/admin', { token });
      setTickets(data);
      if (!activeTicketId && data.length > 0) {
        setActiveTicketId(data[0].id);
      }
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load support tickets');
    }
  }, [token, activeTicketId]);

  const loadActiveTicket = React.useCallback(async () => {
    if (!activeTicketId) return;
    try {
      const details = await apiRequest<TicketDetails>(`/support/tickets/${activeTicketId}`, { token });
      setActiveTicket(details);
    } catch (err: any) {
      setError(err?.message || 'Failed to load selected ticket');
    }
  }, [token, activeTicketId]);

  React.useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  React.useEffect(() => {
    loadActiveTicket();
  }, [loadActiveTicket]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      loadTickets();
      loadActiveTicket();
    }, 5000);
    return () => clearInterval(interval);
  }, [loadTickets, loadActiveTicket]);

  const sendReply = async () => {
    if (!activeTicketId || !reply.trim()) return;
    await apiRequest(`/support/tickets/${activeTicketId}/messages`, {
      method: 'POST',
      token,
      body: { text: reply.trim() },
    });
    setReply('');
    await loadActiveTicket();
    await loadTickets();
  };

  const updateStatus = async (status: 'open' | 'in_progress' | 'resolved') => {
    if (!activeTicketId) return;
    await apiRequest(`/support/tickets/${activeTicketId}/status`, {
      method: 'PATCH',
      token,
      body: { status },
    });
    await loadActiveTicket();
    await loadTickets();
  };

  const claimTicket = async () => {
    if (!activeTicketId || !user?.id) return;
    await apiRequest(`/support/tickets/${activeTicketId}/assign`, {
      method: 'PATCH',
      token,
      body: { assignedToUserId: user.id },
    });
    await loadActiveTicket();
    await loadTickets();
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Customer Support</h1>
        <p className="text-gray-500 mt-1">Real-time support ticketing for riders and drivers.</p>
        {error ? <p className="text-sm text-red-600 mt-2">{error}</p> : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 border border-gray-200 rounded-2xl bg-white overflow-hidden shadow-sm flex flex-col h-[600px]">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-semibold text-gray-900">Active Tickets ({tickets.length})</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => setActiveTicketId(ticket.id)}
                className={`w-full text-left p-3 rounded-xl transition-colors ${ticket.id === activeTicketId ? 'bg-emerald-50 border border-emerald-100/50' : 'hover:bg-gray-50 border border-transparent'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-sm text-gray-900">{ticket.subject}</span>
                  <span className="text-xs text-gray-400">{new Date(ticket.updatedAt).toLocaleTimeString()}</span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-1">Created by {ticket.createdByRole}</p>
                <div className="mt-2 flex gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium">{ticket.status}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{ticket.priority || 'normal'}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 border border-gray-200 rounded-2xl bg-white shadow-sm flex flex-col h-[600px]">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-gray-900">{activeTicket ? `Ticket #${activeTicket.id.slice(0, 8)}` : 'Select a ticket'}</h3>
              <p className="text-xs text-gray-500">{activeTicket ? `From ${activeTicket.createdByRole}` : 'No active ticket selected'}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={claimTicket} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors">Claim</button>
              <button onClick={() => updateStatus('in_progress')} className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 rounded-lg text-sm font-medium transition-colors">In Progress</button>
              <button onClick={() => updateStatus('resolved')} className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 rounded-lg text-sm font-medium transition-colors">Resolve</button>
            </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {activeTicket?.messages?.map((message) => {
              const fromAdmin = message.senderRole === 'admin';
              return (
                <div key={message.id} className={`flex ${fromAdmin ? 'justify-end' : 'justify-start'}`}>
                  <div className={`${fromAdmin ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-800'} p-3 rounded-2xl max-w-[80%]`}>
                    <p className="text-xs opacity-80 mb-1">{message.senderRole}</p>
                    <p className="text-sm">{message.text}</p>
                    <p className="text-[10px] mt-1 opacity-70">{new Date(message.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              );
            })}

            {!activeTicket ? (
              <div className="flex justify-center">
                <div className="bg-amber-50 border border-amber-100 px-4 py-2 rounded-lg flex items-center gap-2 text-sm text-amber-800">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Select a ticket to begin handling support.</span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <div className="relative">
              <input
                type="text"
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                placeholder="Type a reply..."
                className="w-full bg-white border border-gray-200 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
              />
              <button
                onClick={sendReply}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
