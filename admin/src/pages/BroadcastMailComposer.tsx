import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  Eye,
  Image as ImageIcon,
  Link2,
  Mail,
  Send,
  Sparkles,
  Trash2,
  Upload,
  Users,
  UserRound,
  Car,
  X,
} from 'lucide-react';

export interface AudienceSegment {
  id: string;
  label: string;
  count: number;
  description?: string;
  color?: string;
}

export interface BroadcastAttachment {
  filename: string;
  content: string;
  contentType: string;
  size: number;
}

export interface BroadcastPayload {
  senderEmail: string;
  caption: string;
  subheading: string;
  bodyHtml: string;
  previewText: string;
  segments: string[];
  manualEmails: string[];
  estimatedTotal: number;
  attachments?: BroadcastAttachment[];
}

interface BroadcastMailComposerProps {
  segments: AudienceSegment[];
  defaultSenderEmail?: string;
  onSend: (payload: BroadcastPayload) => Promise<void>;
  onClose: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_IMAGE_ATTACHMENTS = 5;
const MAX_IMAGE_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']);

function parseEmailsFromText(text: string): string[] {
  return Array.from(
    new Set(
      text
        .split(/[\s,;\n]+/)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => EMAIL_RE.test(s)),
    ),
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

interface ToolbarState {
  visible: boolean;
  x: number;
  y: number;
}

const BROADCAST_TEMPLATES = [
  {
    id: 'announcement',
    label: 'Announcement',
    emoji: '📢',
    desc: 'New feature or platform news',
    subject: 'Important update from edrive',
    subheading: "Here's what's new",
    previewText: 'We have an exciting update to share with you.',
    body: '<p>Hi {{firstname}},</p><p>We have some exciting news to share with you about edrive.</p><p>[Write your announcement here]</p><p>As always, thank you for being part of our community.</p>',
  },
  {
    id: 'promo',
    label: 'Promotion',
    emoji: '🎁',
    desc: 'Special offer or discount',
    subject: 'An exclusive offer just for you',
    subheading: 'A little something from us',
    previewText: 'We have a special offer waiting for you.',
    body: '<p>Hi {{firstname}},</p><p>We have an exclusive offer just for you.</p><p>[Describe your promotion or discount here]</p><p>This offer is valid for a limited time — do not miss it!</p>',
  },
  {
    id: 'reengagement',
    label: 'Re-engagement',
    emoji: '👋',
    desc: 'Win back inactive users',
    subject: "We haven't seen you in a while",
    subheading: 'Your next ride is waiting',
    previewText: "It's been a while. Come back and ride with us.",
    body: '<p>Hi {{firstname}},</p><p>We noticed it has been a while since your last trip with us, and we wanted to check in.</p><p>Whether you are heading to work, catching up with friends, or just need to get somewhere — edrive is ready whenever you are.</p><p>Open the app and book your next ride today.</p>',
  },
  {
    id: 'safety',
    label: 'Safety Update',
    emoji: '🛡️',
    desc: 'Safety tip or policy notice',
    subject: 'A safety reminder from edrive',
    subheading: 'Your safety is our priority',
    previewText: 'Important safety information from the edrive team.',
    body: '<p>Hi {{firstname}},</p><p>At edrive, your safety is our highest priority. We want to share a few important reminders to help keep every trip safe for everyone.</p><p>[Add your safety tips or policy update here]</p><p>If you ever feel unsafe during a trip, please use the emergency button in the app to get immediate assistance.</p>',
  },
  {
    id: 'service_update',
    label: 'Service Update',
    emoji: '🔧',
    desc: 'Maintenance, outage, or new area',
    subject: 'A service update from edrive',
    subheading: 'Please keep this in mind',
    previewText: 'An update about your edrive service.',
    body: '<p>Hi {{firstname}},</p><p>We have an important update about our service to share with you.</p><p>[Describe the service update, new coverage area, schedule change, or maintenance window here]</p><p>Thank you for your patience and your continued support of edrive.</p>',
  },
  {
    id: 'app_update',
    label: 'App Update',
    emoji: '📱',
    desc: 'New version available',
    subject: 'Update your edrive app',
    subheading: 'New features are waiting for you',
    previewText: 'A new version of edrive is now available.',
    body: '<p>Hi {{firstname}},</p><p>We have released a new version of the edrive app with improvements and exciting new features.</p><p>[List what is new in this update]</p><p>Update from the App Store or Google Play to enjoy the latest experience.</p>',
  },
  {
    id: 'driver_tips',
    label: 'Driver Tips',
    emoji: '🚗',
    desc: 'Earnings tips for drivers',
    subject: 'Tips to boost your earnings on edrive',
    subheading: 'Drive smarter, earn more',
    previewText: 'Here are some tips to help you earn more with edrive.',
    body: '<p>Hi {{firstname}},</p><p>We want to help you make the most of your time on the road with edrive.</p><p>[Add your driver tips, peak hour info, or incentive details here]</p><p>Thank you for being a valued part of the edrive driver community.</p>',
  },
  {
    id: 'seasonal',
    label: 'Seasonal / Holiday',
    emoji: '🎉',
    desc: 'Holiday or seasonal greetings',
    subject: "Season's greetings from edrive",
    subheading: 'Wishing you a wonderful season',
    previewText: 'A message for the season from the edrive team.',
    body: '<p>Hi {{firstname}},</p><p>From everyone at edrive, we wish you and your loved ones a wonderful season filled with joy, laughter, and great memories.</p><p>[Add your seasonal message here]</p><p>Stay safe on the roads — and remember, we are always here when you need a ride.</p>',
  },
] as const;

const SEGMENT_ICONS: Record<string, React.ReactNode> = {
  general: <Users className="h-4 w-4" />,
  all: <Users className="h-4 w-4" />,
  users: <UserRound className="h-4 w-4" />,
  passengers: <UserRound className="h-4 w-4" />,
  riders: <UserRound className="h-4 w-4" />,
  drivers: <Car className="h-4 w-4" />,
};

export const BroadcastMailComposer: React.FC<BroadcastMailComposerProps> = ({
  segments,
  defaultSenderEmail = 'info@edriveapp.com',
  onSend,
  onClose,
}) => {
  const [selectedSegments, setSelectedSegments] = useState<Set<string>>(new Set());
  const [manualEmails, setManualEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [emailInputError, setEmailInputError] = useState('');
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvPreview, setCsvPreview] = useState<string[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);

  const [senderEmail, setSenderEmail] = useState(defaultSenderEmail);
  const [caption, setCaption] = useState('');
  const [subheading, setSubheading] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const [toolbar, setToolbar] = useState<ToolbarState>({ visible: false, x: 0, y: 0 });
  const [linkInputVisible, setLinkInputVisible] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [attachments, setAttachments] = useState<BroadcastAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);

  useEffect(() => {
    setSenderEmail(defaultSenderEmail);
  }, [defaultSenderEmail]);

  const segmentTotal = Array.from(selectedSegments).reduce((sum, id) => {
    const seg = segments.find((s) => s.id === id);
    return sum + (seg?.count ?? 0);
  }, 0);

  const estimatedTotal = segmentTotal + manualEmails.length;
  const hasRecipients = selectedSegments.size > 0 || manualEmails.length > 0;

  const toggleSegment = (id: string) => {
    setSelectedSegments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const commitEmailInput = () => {
    const val = emailInput.trim().toLowerCase();
    if (!val) return;
    if (!EMAIL_RE.test(val)) {
      setEmailInputError('Invalid email address');
      return;
    }
    if (manualEmails.includes(val)) {
      setEmailInputError('Already added');
      return;
    }
    setManualEmails((prev) => [...prev, val]);
    setEmailInput('');
    setEmailInputError('');
  };

  const handleEmailKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      commitEmailInput();
    }
    if (e.key === 'Backspace' && emailInput === '' && manualEmails.length > 0) {
      setManualEmails((prev) => prev.slice(0, -1));
    }
  };

  const removeEmail = (email: string) => setManualEmails((prev) => prev.filter((e) => e !== email));

  useEffect(() => {
    if (!csvText) {
      setCsvPreview([]);
      return;
    }
    const parsed = parseEmailsFromText(csvText);
    const deduped = parsed.filter((e) => !manualEmails.includes(e));
    setCsvPreview(deduped.slice(0, 8));
  }, [csvText, manualEmails]);

  const applyCSV = () => {
    const parsed = parseEmailsFromText(csvText);
    const merged = Array.from(new Set([...manualEmails, ...parsed]));
    setManualEmails(merged);
    setCsvText('');
    setCsvModalOpen(false);
  };

  const handleSelectionChange = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      if (!linkInputVisible) setToolbar((t) => ({ ...t, visible: false }));
      return;
    }
    if (!editorRef.current?.contains(sel.anchorNode)) {
      setToolbar((t) => ({ ...t, visible: false }));
      return;
    }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const editorRect = editorRef.current.getBoundingClientRect();
    setToolbar({
      visible: true,
      x: rect.left - editorRect.left + rect.width / 2,
      y: rect.top - editorRect.top - 12,
    });
    setLinkInputVisible(false);
  }, [linkInputVisible]);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [handleSelectionChange]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        toolbarRef.current &&
        !toolbarRef.current.contains(e.target as Node) &&
        editorRef.current &&
        !editorRef.current.contains(e.target as Node)
      ) {
        setToolbar((t) => ({ ...t, visible: false }));
        setLinkInputVisible(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const saveRange = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedRangeRef.current = sel.getRangeAt(0).cloneRange();
  };

  const restoreRange = () => {
    if (!savedRangeRef.current) return;
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(savedRangeRef.current);
  };

  const handleAddLinkClick = () => {
    saveRange();
    setLinkInputVisible(true);
    setLinkUrl('');
    setTimeout(() => linkInputRef.current?.focus(), 50);
  };

  const applyLink = () => {
    if (!linkUrl.trim()) return;
    restoreRange();
    const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
    document.execCommand('createLink', false, url);
    editorRef.current?.querySelectorAll('a').forEach((a) => {
      if (!a.getAttribute('target')) a.setAttribute('target', '_blank');
      if (!a.getAttribute('rel')) a.setAttribute('rel', 'noopener noreferrer');
    });
    setLinkInputVisible(false);
    setLinkUrl('');
    setToolbar((t) => ({ ...t, visible: false }));
  };

  const handleLinkKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') applyLink();
    if (e.key === 'Escape') {
      setLinkInputVisible(false);
      setToolbar((t) => ({ ...t, visible: false }));
    }
  };

  const handleDeleteSelection = () => {
    document.execCommand('delete');
    setToolbar((t) => ({ ...t, visible: false }));
  };

  const handleUnlink = () => {
    restoreRange();
    document.execCommand('unlink');
    setToolbar((t) => ({ ...t, visible: false }));
  };

  const selectionIsLink = (): boolean => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return false;
    return sel.anchorNode?.parentElement?.closest('a') !== null;
  };

  const applyTemplate = (id: string) => {
    const tpl = BROADCAST_TEMPLATES.find((t) => t.id === id);
    if (!tpl) return;
    setCaption(tpl.subject);
    setSubheading(tpl.subheading);
    setPreviewText(tpl.previewText);
    if (editorRef.current) editorRef.current.innerHTML = tpl.body;
    setActiveTemplate(id);
  };


  const handleImageFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError('');

    const remainingSlots = MAX_IMAGE_ATTACHMENTS - attachments.length;
    if (remainingSlots <= 0) {
      setError(`You can attach up to ${MAX_IMAGE_ATTACHMENTS} images.`);
      return;
    }

    const selected = Array.from(files).slice(0, remainingSlots);
    const rejected = Array.from(files).length - selected.length;
    const next: BroadcastAttachment[] = [];

    for (const file of selected) {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        setError('Only PNG, JPG, WebP, GIF, or SVG images can be attached.');
        continue;
      }
      if (file.size > MAX_IMAGE_ATTACHMENT_BYTES) {
        setError(`Each image must be ${fmtBytes(MAX_IMAGE_ATTACHMENT_BYTES)} or smaller.`);
        continue;
      }

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(reader.error || new Error('Failed to read image'));
        reader.readAsDataURL(file);
      });
      const content = dataUrl.split(',')[1] || '';
      next.push({ filename: file.name, content, contentType: file.type, size: file.size });
    }

    setAttachments((prev) => [...prev, ...next]);
    if (rejected > 0) setError(`Only ${MAX_IMAGE_ATTACHMENTS} images can be attached. ${rejected} file(s) skipped.`);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (filename: string, index: number) => {
    setAttachments((prev) => prev.filter((item, i) => !(i === index && item.filename === filename)));
  };

  const handleSend = async () => {
    if (!EMAIL_RE.test(senderEmail.trim().toLowerCase())) {
      setError('Sender email is invalid.');
      return;
    }
    if (!hasRecipients) {
      setError('Select at least one audience or add direct recipients.');
      return;
    }
    if (!caption.trim()) {
      setError('Subject is required.');
      return;
    }
    if (!editorRef.current?.innerText.trim()) {
      setError('Body cannot be empty.');
      return;
    }

    setError('');
    setSending(true);
    try {
      await onSend({
        senderEmail: senderEmail.trim().toLowerCase(),
        caption: caption.trim(),
        subheading: subheading.trim(),
        bodyHtml: editorRef.current.innerHTML,
        previewText: previewText.trim(),
        segments: Array.from(selectedSegments),
        manualEmails,
        estimatedTotal,
        attachments,
      });
      setSent(true);
      setTimeout(() => setSent(false), 5000);
    } catch (err: any) {
      setError(err?.message || 'Failed to send. Try again.');
    } finally {
      setSending(false);
    }
  };

  const handlePreview = () => {
    const bodyHtml = editorRef.current?.innerHTML ?? '';
    // Replace {{firstname}} with a sample name so the preview shows personalisation
    const personalised = bodyHtml.replace(/\{\{firstname\}\}/gi, 'Alex');
    const safeBody = personalised.replace(/<a\s/gi, '<a style="color:#16a34a;text-decoration:underline;font-weight:600;" ');
    const attachmentHtml = attachments.length
      ? `<div style="margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px;">
          <div style="font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;">Attachments</div>
          ${attachments.map((file) => `<div style="display:inline-block;margin:0 8px 8px 0;padding:8px 10px;border:1px solid #dbe4ea;border-radius:999px;background:#f8fafc;color:#334155;font-size:12px;">${escapeHtml(file.filename)} · ${fmtBytes(file.size)}</div>`).join('')}
        </div>`
      : '';

    setPreviewHtml(`
      <div style="font-family:Inter,Helvetica Neue,Arial,sans-serif;background:#f8fafc;min-height:100vh;padding:32px 16px;color:#0f172a;">
        <div style="max-width:640px;margin:0 auto;">
          <div style="margin-bottom:12px;text-align:center;font-size:12px;color:#64748b;">Preview with <strong>Alex</strong> as {{firstname}}</div>
          <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;box-shadow:0 12px 30px rgba(15,23,42,0.08);">
            <div style="padding:24px 28px;border-bottom:1px solid #e5e7eb;">
              <div style="font-size:28px;font-weight:800;letter-spacing:-0.04em;color:#005124;"><span style="display:inline-block;transform:rotate(-22.26deg);transform-origin:50% 60%;margin-right:1px;">e</span>drive</div>
            </div>
            <div style="padding:28px;">
              <h1 style="margin:0 0 10px;font-size:24px;line-height:1.25;color:#0f172a;">${escapeHtml(caption || 'Campaign subject')}</h1>
              ${subheading ? `<p style="margin:0 0 20px;font-size:15px;font-weight:700;color:#047857;">${escapeHtml(subheading)}</p>` : ''}
              <div style="height:1px;background:#e5e7eb;margin:0 0 22px;"></div>
              <div style="font-size:15px;line-height:1.75;color:#334155;">${safeBody || '<p style="color:#94a3b8">Your message preview appears here.</p>'}</div>
              ${attachmentHtml}
            </div>
            <div style="padding:0 28px 24px;text-align:center;background:#ffffff;">
              <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px;">Get the edrive app</div>
              <div>
                <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" alt="Get it on Google Play" style="display:inline-block;width:136px;height:auto;margin:0 6px;vertical-align:middle;" />
                <img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="Download on the App Store" style="display:inline-block;width:122px;height:auto;margin:0 6px;vertical-align:middle;" />
              </div>
            </div>
            <div style="padding:20px 28px;text-align:center;background:#f8fafc;border-top:1px solid #e5e7eb;">
              <p style="margin:0 0 8px;font-size:12px;color:#64748b;">If you'd like to report an issue, reach out to <span style="color:#047857;text-decoration:underline;">edrive support</span></p>
              <p style="margin:0;font-size:11px;color:#94a3b8;">© 2026 edrive Technologies. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>
    `);
    setPreviewMode(true);
  };

  const parsedCsvCount = parseEmailsFromText(csvText).length;

  return (
    <>
      {csvModalOpen && (
        <div className="fixed inset-0 z-90 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Import recipient emails</h3>
                <p className="text-sm text-slate-500">Paste a CSV column, comma-separated list, or one email per line.</p>
              </div>
              <button onClick={() => { setCsvModalOpen(false); setCsvText(''); }} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={'john@example.com\njane@example.com\n...'}
              className="h-40 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none ring-0 placeholder:text-slate-400 focus:border-emerald-500"
            />

            {csvPreview.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                  Preview · {parsedCsvCount} valid email{parsedCsvCount === 1 ? '' : 's'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {csvPreview.map((email) => (
                    <span key={email} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                      {email}
                    </span>
                  ))}
                  {parsedCsvCount > 8 && <span className="self-center text-xs text-slate-500">+{parsedCsvCount - 8} more</span>}
                </div>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button onClick={() => { setCsvModalOpen(false); setCsvText(''); }} className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={applyCSV}
                disabled={parsedCsvCount === 0}
                className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                Add {parsedCsvCount || ''} {parsedCsvCount === 1 ? 'email' : 'emails'}
              </button>
            </div>
          </div>
        </div>
      )}

      {previewMode && (
        <div className="fixed inset-0 z-95 flex flex-col bg-slate-950/80 backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 text-white">
            <div>
              <p className="text-sm font-semibold">Campaign preview</p>
              <p className="text-xs text-white/70">Review the email before sending.</p>
            </div>
            <button onClick={() => setPreviewMode(false)} className="rounded-full border border-white/10 px-4 py-2 text-sm transition hover:bg-white/10">
              Close
            </button>
          </div>
          <div className="flex-1 overflow-auto" dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </div>
      )}

      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.14)]">
        <div className="border-b border-slate-200 bg-slate-950 px-6 py-5 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">
                <Sparkles className="h-4 w-4" /> Email campaign
              </div>
              <h2 className="text-2xl font-semibold">Broadcast email composer</h2>
              <p className="mt-1 text-sm text-slate-300">Send to general audience, app users, drivers, or a direct list.</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handlePreview} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10">
                <Eye className="h-4 w-4" /> Preview
              </button>
              <button onClick={onClose} className="rounded-2xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10">
                Close
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="border-b border-slate-200 bg-slate-50 p-6 lg:border-b-0 lg:border-r">
            <div className="space-y-6">
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Recipients</p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-900">Audience</h3>
                  </div>
                  <button onClick={() => setCsvModalOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-400 hover:text-emerald-700">
                    <Upload className="h-3.5 w-3.5" /> Import CSV
                  </button>
                </div>

                <div className="grid gap-3">
                  {segments.map((seg) => {
                    const active = selectedSegments.has(seg.id);
                    const accent = seg.color ?? '#16a34a';
                    return (
                      <button
                        key={seg.id}
                        onClick={() => toggleSegment(seg.id)}
                        className={`rounded-2xl border px-4 py-4 text-left transition ${
                          active
                            ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 rounded-xl p-2" style={{ backgroundColor: active ? `${accent}20` : '#f1f5f9', color: accent }}>
                              {SEGMENT_ICONS[seg.id] ?? <Users className="h-4 w-4" />}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">{seg.label}</div>
                              <div className="mt-1 text-xs text-slate-500">{seg.description || 'Audience segment from backend recipients.'}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold text-slate-900">{fmt(seg.count)}</div>
                            <div className={`text-xs font-medium ${active ? 'text-emerald-700' : 'text-slate-400'}`}>{active ? 'Selected' : 'Available'}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Direct emails</label>
                <div onClick={() => emailInputRef.current?.focus()} className="flex min-h-14 flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 transition focus-within:border-emerald-500">
                  {manualEmails.map((email) => (
                    <span key={email} className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white">
                      {email}
                      <button onClick={(e) => { e.stopPropagation(); removeEmail(email); }} className="text-slate-400 transition hover:text-white">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                  <input
                    ref={emailInputRef}
                    value={emailInput}
                    onChange={(e) => { setEmailInput(e.target.value); setEmailInputError(''); }}
                    onKeyDown={handleEmailKeyDown}
                    onBlur={commitEmailInput}
                    placeholder={manualEmails.length === 0 ? 'name@example.com' : ''}
                    className="min-w-[180px] flex-1 border-none bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                  />
                </div>
                <div className="mt-2 min-h-5 text-xs">
                  {emailInputError ? (
                    <p className="text-red-600">{emailInputError}</p>
                  ) : manualEmails.length > 0 ? (
                    <p className="text-slate-500">
                      {manualEmails.length} direct recipient{manualEmails.length === 1 ? '' : 's'} added.
                      <button onClick={() => setManualEmails([])} className="ml-1 font-medium text-slate-700 underline">
                        Clear all
                      </button>
                    </p>
                  ) : (
                    <p className="text-slate-400">Use this for one-off addresses outside the segment lists.</p>
                  )}
                </div>
              </section>

              <section className="rounded-3xl bg-slate-900 p-5 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Delivery summary</p>
                <div className="mt-3 text-3xl font-semibold">~{estimatedTotal.toLocaleString()}</div>
                <p className="mt-1 text-sm text-slate-300">Estimated recipients from selected backend audiences and direct emails.</p>
                <div className="mt-4 space-y-2 text-sm text-slate-300">
                  <div className="flex justify-between"><span>Segments</span><span>{selectedSegments.size}</span></div>
                  <div className="flex justify-between"><span>Direct emails</span><span>{manualEmails.length}</span></div>
                  <div className="flex justify-between"><span>Sender</span><span className="truncate pl-4">{senderEmail || defaultSenderEmail}</span></div>
                </div>
              </section>
            </div>
          </aside>

          <section className="p-6 lg:p-8">

            {/* Template picker */}
            <div className="mb-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Start from a template</p>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {BROADCAST_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => applyTemplate(tpl.id)}
                    className={`flex min-w-[130px] flex-col items-start gap-1 rounded-2xl border px-4 py-3 text-left transition ${
                      activeTemplate === tpl.id
                        ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xl">{tpl.emoji}</span>
                    <span className="text-sm font-semibold text-slate-900">{tpl.label}</span>
                    <span className="text-xs text-slate-500">{tpl.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Sender email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    placeholder="support@edriveapp.com"
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-emerald-500"
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">Use a verified sender such as support@edriveapp.com.</p>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Inbox preview text</label>
                <input
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  maxLength={140}
                  placeholder="Short preview text shown beside the subject"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Subject</label>
                <input
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Your campaign subject"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-900 outline-none transition focus:border-emerald-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Subheading</label>
                <input
                  value={subheading}
                  onChange={(e) => setSubheading(e.target.value)}
                  placeholder="Optional supporting line"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Email body</label>
                  <p className="mt-1 text-sm text-slate-500">Highlight text to add or remove links.</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="text-xs text-slate-400">Merge tags</span>
                  <button
                    type="button"
                    onClick={() => {
                      editorRef.current?.focus();
                      document.execCommand('insertText', false, '{{firstname}}');
                    }}
                    className="rounded-lg border border-dashed border-emerald-400 bg-emerald-50 px-2.5 py-1 font-mono text-xs text-emerald-700 transition hover:bg-emerald-100"
                    title="Insert firstname merge tag — replaced with each recipient's first name on send"
                  >
                    {'{{firstname}}'}
                  </button>
                </div>
              </div>

              <div className="relative">
                {toolbar.visible && (
                  <div
                    ref={toolbarRef}
                    onMouseDown={(e) => e.preventDefault()}
                    className="absolute z-20 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                    style={{ left: toolbar.x, top: toolbar.y, transform: 'translate(-50%, -100%)' }}
                  >
                    {!linkInputVisible ? (
                      <div className="flex items-center">
                        {selectionIsLink() ? (
                          <ToolbarButton onClick={handleUnlink} icon={<Link2 className="h-4 w-4" />} label="Unlink" />
                        ) : (
                          <ToolbarButton onClick={handleAddLinkClick} icon={<Link2 className="h-4 w-4" />} label="Add link" />
                        )}
                        <div className="h-10 w-px bg-slate-200" />
                        <ToolbarButton onClick={handleDeleteSelection} icon={<Trash2 className="h-4 w-4" />} label="Delete" tone="danger" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-2">
                        <input
                          ref={linkInputRef}
                          value={linkUrl}
                          onChange={(e) => setLinkUrl(e.target.value)}
                          onKeyDown={handleLinkKeyDown}
                          placeholder="https://edriveapp.com"
                          className="w-60 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500"
                        />
                        <button onClick={applyLink} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
                          Apply
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  data-placeholder="Write your broadcast email here. Highlight text to insert a link."
                  className="min-h-[300px] rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4 text-[15px] leading-8 text-slate-700 outline-none transition focus:border-emerald-500"
                />
              </div>
            </div>


            <div className="mt-6 rounded-[24px] border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Image attachments</label>
                  <p className="mt-1 text-sm text-slate-500">Attach up to 5 images. PNG, JPG, WebP, GIF, or SVG. Max 5 MB each.</p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-400 hover:text-emerald-700"
                >
                  <ImageIcon className="h-4 w-4" /> Add images
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  multiple
                  className="hidden"
                  onChange={(e) => void handleImageFiles(e.target.files)}
                />
              </div>

              {attachments.length > 0 && (
                <div className="mt-4 grid gap-2">
                  {attachments.map((file, index) => (
                    <div key={`${file.filename}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{file.filename}</p>
                        <p className="text-xs text-slate-500">{file.contentType} · {fmtBytes(file.size)}</p>
                      </div>
                      <button onClick={() => removeAttachment(file.filename, index)} className="rounded-xl p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600" title="Remove attachment">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4">
              <div>
                {error && <p className="text-sm font-medium text-red-600">{error}</p>}
                {sent && <p className="text-sm font-medium text-emerald-700">Campaign sent to approximately {estimatedTotal.toLocaleString()} recipients.</p>}
                {!error && !sent && (
                  <p className="text-sm text-slate-500">
                    {hasRecipients
                      ? `Ready to send to approximately ${estimatedTotal.toLocaleString()} recipients.`
                      : 'Select an audience or add direct emails to continue.'}
                  </p>
                )}
              </div>

              <button
                onClick={handleSend}
                disabled={sending || !hasRecipients}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                <Send className="h-4 w-4" />
                {sending ? 'Sending…' : 'Send campaign'}
                {hasRecipients && <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">~{fmt(estimatedTotal)}</span>}
              </button>
            </div>
          </section>
        </div>

        <style>{`
          [contenteditable]:empty:before { content: attr(data-placeholder); color: #94a3b8; pointer-events: none; }
          [contenteditable] a { color: #16a34a; text-decoration: underline; cursor: pointer; }
        `}</style>
      </div>
    </>
  );
};

const ToolbarButton: React.FC<{
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  tone?: 'default' | 'danger';
}> = ({ onClick, icon, label, tone = 'default' }) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium transition ${
      tone === 'danger' ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-50'
    }`}
  >
    {icon}
    {label}
  </button>
);

export default BroadcastMailComposer;
