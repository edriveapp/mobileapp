import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell, Plus, Send, Trash2, Pause, Play, Calendar,
  Clock, Repeat, Megaphone, X, Edit2, CheckCircle, Mail, Inbox,
} from 'lucide-react';
import { apiRequest } from '../lib/api.ts';
import { useAuth } from '../lib/auth.tsx';
import { BroadcastMailComposer, type AudienceSegment, type BroadcastPayload } from './BroadcastMailComposer';

type RepeatOption = 'once' | 'daily' | 'weekly' | 'weekdays' | 'weekends';
type CampaignStatus = 'active' | 'paused' | 'expired';

type Campaign = {
  id: string;
  title: string;
  body: string;
  repeat: RepeatOption;
  dayOfWeek: number | null;
  sendTime: string;
  status: CampaignStatus;
  lastSentAt: string | null;
  nextSendAt: string | null;
  createdAt: string;
};

type BroadcastAudienceSummary = {
  defaultSenderEmail: string;
  segments: AudienceSegment[];
};

type SupportTicketSummary = {
  id: string;
  subject: string;
  description: string;
  category?: string;
  priority?: string;
  createdByRole: string;
  createdByUserId: string | null;
  createdByEmail?: string | null;
  creatorName?: string;
  createdAt: string;
  updatedAt: string;
  status: 'open' | 'in_progress' | 'resolved';
};

const REPEAT_LABELS: Record<RepeatOption, string> = {
  once: 'Send Once',
  daily: 'Every Day',
  weekly: 'Weekly',
  weekdays: 'Weekdays (Mon-Fri)',
  weekends: 'Weekends',
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const STATUS_STYLES: Record<CampaignStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  paused: 'bg-amber-50 text-amber-700 border-amber-200',
  expired: 'bg-gray-100 text-gray-500 border-gray-200',
};

const STATUS_ICONS: Record<CampaignStatus, React.ReactNode> = {
  active: <Play className="w-3 h-3" />,
  paused: <Pause className="w-3 h-3" />,
  expired: <CheckCircle className="w-3 h-3" />,
};

// ─── Campaign Composer ───────────────────────────────────────────────────────

function CampaignComposer({
  onSave,
  onClose,
  token,
  editCampaign,
}: {
  onSave: (campaign: Campaign) => void;
  onClose: () => void;
  token: string | null;
  editCampaign?: Campaign | null;
}) {
  const [title, setTitle] = useState(editCampaign?.title || '');
  const [body, setBody] = useState(editCampaign?.body || '');
  const [repeat, setRepeat] = useState<RepeatOption>(editCampaign?.repeat || 'once');
  const [dayOfWeek, setDayOfWeek] = useState<number>(editCampaign?.dayOfWeek ?? 5); // Friday default
  const [sendTime, setSendTime] = useState(editCampaign?.sendTime || '09:00');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        body: body.trim(),
        repeat,
        dayOfWeek: repeat === 'weekly' ? dayOfWeek : null,
        sendTime,
      };
      let result: Campaign;
      if (editCampaign) {
        result = await apiRequest<Campaign>(`/admin/campaigns/${editCampaign.id}`, {
          method: 'PATCH', token, body: payload,
        });
      } else {
        result = await apiRequest<Campaign>('/admin/campaigns', {
          method: 'POST', token, body: payload,
        });
      }
      onSave(result);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-violet-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">
              {editCampaign ? 'Edit Campaign' : 'New Campaign'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notification Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Happy Friday! 🎉"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
            <textarea
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="e.g. It's Friday! Book a safe ride home with eDrive tonight. 🚗"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">{body.length} characters</p>
          </div>

          {/* Preview */}
          {(title || body) && (
            <div className="bg-gray-900 text-white rounded-xl p-4 text-sm">
              <p className="text-xs text-gray-400 mb-1">Preview</p>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white">{title || 'Title…'}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{body || 'Your message…'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Schedule */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Repeat</label>
              <select
                value={repeat}
                onChange={(e) => setRepeat(e.target.value as RepeatOption)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
              >
                {Object.entries(REPEAT_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Send Time</label>
              <input
                type="time"
                value={sendTime}
                onChange={(e) => setSendTime(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
          </div>

          {repeat === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Day of Week</label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day, idx) => (
                  <button
                    key={day}
                    onClick={() => setDayOfWeek(idx)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                      dayOfWeek === idx
                        ? 'bg-violet-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 pt-0 flex gap-3">
          <button
            disabled={!title.trim() || !body.trim() || saving}
            onClick={handleSave}
            className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : editCampaign ? 'Update Campaign' : 'Create Campaign'}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 bg-gray-100 text-gray-600 text-sm rounded-xl hover:bg-gray-200 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Notifications Page ─────────────────────────────────────────────────

export default function Notifications() {
  const { token } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [emailComposerOpen, setEmailComposerOpen] = useState(false);
  const [emailSegments, setEmailSegments] = useState<AudienceSegment[]>([]);
  const [defaultSenderEmail, setDefaultSenderEmail] = useState('support@edriveapp.com');
  const [inboundEmails, setInboundEmails] = useState<SupportTicketSummary[]>([]);

  const handleEmailSend = async (payload: BroadcastPayload) => {
    await apiRequest('/admin/broadcast/send', { method: 'POST', token, body: payload });
  };

  const loadCampaigns = useCallback(async () => {
    try {
      const data = await apiRequest<Campaign[]>('/admin/campaigns', { token });
      setCampaigns(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);

  useEffect(() => {
    const loadAudienceSummary = async () => {
      try {
        const data = await apiRequest<BroadcastAudienceSummary>('/admin/broadcast/audience-summary', { token });
        setEmailSegments(data.segments || []);
        setDefaultSenderEmail(data.defaultSenderEmail || 'support@edriveapp.com');
      } catch (e) {
        console.error(e);
      }
    };

    loadAudienceSummary();
  }, [token]);

  const loadInboundEmails = useCallback(async () => {
    try {
      const tickets = await apiRequest<SupportTicketSummary[]>('/support/tickets/admin', { token });
      setInboundEmails((tickets || []).filter((ticket) => ticket.category === 'inbound_email').slice(0, 8));
    } catch (e) {
      console.error(e);
    }
  }, [token]);

  useEffect(() => {
    loadInboundEmails();
  }, [loadInboundEmails]);

  const handleSaved = (campaign: Campaign) => {
    setCampaigns((prev) => {
      const idx = prev.findIndex((c) => c.id === campaign.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = campaign;
        return updated;
      }
      return [campaign, ...prev];
    });
    setComposerOpen(false);
    setEditCampaign(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this campaign?')) return;
    try {
      await apiRequest(`/admin/campaigns/${id}`, { method: 'DELETE', token });
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch (e: any) { alert(e.message); }
  };

  const handleToggleStatus = async (campaign: Campaign) => {
    const newStatus = campaign.status === 'active' ? 'paused' : 'active';
    try {
      const updated = await apiRequest<Campaign>(`/admin/campaigns/${campaign.id}`, {
        method: 'PATCH', token, body: { status: newStatus },
      });
      setCampaigns((prev) => prev.map((c) => c.id === updated.id ? updated : c));
    } catch (e: any) { alert(e.message); }
  };

  const handleSendNow = async (id: string) => {
    setSending(id);
    try {
      await apiRequest(`/admin/campaigns/${id}/send-now`, { method: 'POST', token });
      alert('Notification sent to all users!');
      loadCampaigns();
    } catch (e: any) { alert(e.message); }
    finally { setSending(null); }
  };

  const activeCampaigns = campaigns.filter((c) => c.status === 'active');
  const pausedCampaigns = campaigns.filter((c) => c.status === 'paused');
  const expiredCampaigns = campaigns.filter((c) => c.status === 'expired');

  return (
    <div className="p-8 space-y-6">
      {(composerOpen || editCampaign) && (
        <CampaignComposer
          token={token}
          onSave={handleSaved}
          onClose={() => { setComposerOpen(false); setEditCampaign(null); }}
          editCampaign={editCampaign}
        />
      )}

      {emailComposerOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-start justify-center z-40 p-6 overflow-y-auto">
          <div className="w-full max-w-3xl my-8">
            <BroadcastMailComposer
              segments={emailSegments}
              defaultSenderEmail={defaultSenderEmail}
              onSend={handleEmailSend}
              onClose={() => setEmailComposerOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">OTA Notifications</h1>
          <p className="text-gray-500 mt-1">
            Compose and schedule push notifications to all app users.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setEmailComposerOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-emerald-500 text-emerald-600 hover:bg-emerald-50 text-sm font-semibold rounded-xl shadow-sm transition-colors"
          >
            <Mail className="w-4 h-4" />
            Email Campaign
          </button>
          <button
            onClick={() => setComposerOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Active', count: activeCampaigns.length, color: 'text-emerald-600 bg-emerald-50', icon: <Play className="w-5 h-5 text-emerald-500" /> },
          { label: 'Paused', count: pausedCampaigns.length, color: 'text-amber-600 bg-amber-50', icon: <Pause className="w-5 h-5 text-amber-500" /> },
          { label: 'Expired', count: expiredCampaigns.length, color: 'text-gray-500 bg-gray-100', icon: <CheckCircle className="w-5 h-5 text-gray-400" /> },
        ].map(({ label, count, color, icon }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color.split(' ')[1]}`}>{icon}</div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-sm text-gray-400">{label} Campaigns</p>
            </div>
          </div>
        ))}
      </div>

      {/* Inbound Emails */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Inbox className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Inbound Emails</h2>
              <p className="text-sm text-gray-500">Recent emails received into the support inbox.</p>
            </div>
          </div>
          <button
            onClick={loadInboundEmails}
            className="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Refresh
          </button>
        </div>

        {inboundEmails.length === 0 ? (
          <div className="p-8 text-center">
            <Mail className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">No inbound emails yet</p>
            <p className="text-xs text-gray-400 mt-1">Incoming support emails will appear here automatically.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {inboundEmails.map((email) => (
              <div key={email.id} className="p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-gray-900 truncate">{email.subject}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium uppercase tracking-wide">
                      inbound
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium uppercase tracking-wide">
                      {email.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    From {email.createdByEmail || email.creatorName || 'Unknown sender'}
                  </p>
                  <p className="text-sm text-gray-500 mt-2 line-clamp-3">
                    {email.description}
                  </p>
                </div>
                <div className="text-xs text-gray-400 shrink-0">
                  {new Date(email.updatedAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {loading && <p className="text-sm text-gray-400">Loading campaigns…</p>}

      {/* Campaign List */}
      {campaigns.length === 0 && !loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <Megaphone className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No campaigns yet</p>
          <p className="text-sm text-gray-300 mt-1">Create your first push notification campaign above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-violet-500" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-900">{campaign.title}</h3>
                  <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLES[campaign.status]}`}>
                    {STATUS_ICONS[campaign.status]} {campaign.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{campaign.body}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Repeat className="w-3 h-3" />
                    {REPEAT_LABELS[campaign.repeat]}
                    {campaign.repeat === 'weekly' && campaign.dayOfWeek != null && ` — ${DAYS[campaign.dayOfWeek]}`}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {campaign.sendTime}
                  </span>
                  {campaign.nextSendAt && campaign.status === 'active' && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Next: {new Date(campaign.nextSendAt).toLocaleString()}
                    </span>
                  )}
                  {campaign.lastSentAt && (
                    <span className="flex items-center gap-1">
                      <Send className="w-3 h-3" />
                      Last: {new Date(campaign.lastSentAt).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleSendNow(campaign.id)}
                  disabled={sending === campaign.id}
                  title="Send Now"
                  className="p-2 text-violet-500 hover:bg-violet-50 rounded-lg transition-colors disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                </button>
                {campaign.status !== 'expired' && (
                  <button
                    onClick={() => handleToggleStatus(campaign)}
                    title={campaign.status === 'active' ? 'Pause' : 'Resume'}
                    className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                  >
                    {campaign.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                )}
                <button
                  onClick={() => setEditCampaign(campaign)}
                  title="Edit"
                  className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(campaign.id)}
                  title="Delete"
                  className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
