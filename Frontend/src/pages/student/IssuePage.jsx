import { useEffect, useMemo, useState } from 'react';
import { createIssue, getMyIssues } from '../../api/issueApi';
import useActionCooldown from '../../hooks/useActionCooldown';

const categories = [
  { value: 'seat', label: 'Seat' },
  { value: 'payment', label: 'Payment' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'profile', label: 'Profile' },
  { value: 'facility', label: 'Library facility' },
  { value: 'other', label: 'Other' },
];

const statusLabels = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export default function IssuePage() {
  const issueCooldown = useActionCooldown(10000);
  const [form, setForm] = useState({
    subject: '',
    category: 'seat',
    message: '',
  });
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  const openCount = useMemo(
    () =>
      issues.filter((issue) => ['open', 'in_progress'].includes(issue.status))
        .length,
    [issues]
  );

  const loadIssues = async () => {
    try {
      setLoading(true);
      const response = await getMyIssues({ limit: 50 });
      setIssues(response.issues || []);
    } catch (error) {
      setNotice({
        type: 'error',
        message: error.message || 'Could not load your submitted issues.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIssues();
  }, []);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setNotice(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      !issueCooldown.guard((seconds) =>
        setNotice({
          type: 'error',
          message: `Please wait ${seconds}s before submitting another issue.`,
        })
      )
    ) {
      return;
    }

    if (form.subject.trim().length < 5 || form.message.trim().length < 10) {
      setNotice({
        type: 'error',
        message: 'Please add a clear subject and describe the issue properly.',
      });
      return;
    }

    try {
      setSaving(true);
      issueCooldown.startCooldown();
      setNotice(null);
      await createIssue({
        subject: form.subject,
        category: form.category,
        message: form.message,
      });
      setForm({ subject: '', category: 'seat', message: '' });
      setNotice({
        type: 'success',
        message:
          'Your issue has been submitted. The library admin can now review it.',
      });
      await loadIssues();
    } catch (error) {
      setNotice({
        type: 'error',
        message:
          error.message || 'Could not submit your issue. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='min-h-screen bg-slate-50 pb-12'>
      <header className='bg-[#11182B]'>
        <div className='max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20'>
          <h1
            className='text-[26px] text-white'
            style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}
          >
            Support
          </h1>
          <p className='text-[13.5px] text-[#9AA4C2] mt-1'>
            Raise a library, payment, seat, or account issue directly with the
            admin.
          </p>
          <p className='text-[13.5px] text-[#9AA4C2] mt-1'>
            Your identity will be confidential feel free to tell the issue.
          </p>
        </div>
      </header>

      <main className='max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6'>
        <section className='bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7'>
          <div className='flex items-start justify-between gap-4 mb-6'>
            <div>
              <h2 className='text-[18px] font-semibold text-slate-900'>
                Raise an issue
              </h2>
              <p className='text-[13px] text-slate-500 mt-1'>
                Add enough detail so the admin can understand and resolve it
                quickly.
              </p>
            </div>
            <span className='rounded-full bg-amber-50 text-amber-700 px-3 py-1 text-[12px] font-semibold'>
              {openCount} active
            </span>
          </div>

          {notice && (
            <div
              className={`mb-5 rounded-lg border px-4 py-3 text-[13px] ${
                notice.type === 'error'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
              {notice.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className='space-y-5'>
            <div>
              <label className='block text-[13px] font-medium text-slate-700 mb-1.5'>
                Subject
              </label>
              <input
                type='text'
                value={form.subject}
                onChange={(event) => updateField('subject', event.target.value)}
                maxLength={120}
                placeholder='Example: Payment receipt is not showing'
                className='w-full rounded-lg border border-slate-300 px-3 py-2.5 text-[14px] outline-none focus:border-[#F4B740] focus:ring-4 focus:ring-[#F4B740]/15'
              />
            </div>

            <div>
              <label className='block text-[13px] font-medium text-slate-700 mb-1.5'>
                Category
              </label>
              <select
                value={form.category}
                onChange={(event) =>
                  updateField('category', event.target.value)
                }
                className='w-full rounded-lg border border-slate-300 px-3 py-2.5 text-[14px] outline-none focus:border-[#F4B740] focus:ring-4 focus:ring-[#F4B740]/15'
              >
                {categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className='flex items-center justify-between mb-1.5'>
                <label className='block text-[13px] font-medium text-slate-700'>
                  Message
                </label>
                <span className='text-[11px] text-slate-400'>
                  {form.message.length}/2000
                </span>
              </div>
              <textarea
                value={form.message}
                onChange={(event) => updateField('message', event.target.value)}
                maxLength={2000}
                rows={7}
                placeholder='Describe what happened, when it happened, and what you expected.'
                className='w-full rounded-lg border border-slate-300 px-3 py-2.5 text-[14px] outline-none resize-y focus:border-[#F4B740] focus:ring-4 focus:ring-[#F4B740]/15'
              />
            </div>

            <button
              type='submit'
              disabled={saving || issueCooldown.isCoolingDown}
              className='inline-flex items-center justify-center rounded-lg bg-[#11182B] px-5 py-2.5 text-white text-[14px] font-semibold hover:bg-[#1B2540] disabled:opacity-60'
            >
              {saving
                ? 'Submitting...'
                : issueCooldown.isCoolingDown
                  ? `Wait ${issueCooldown.remainingSeconds}s`
                  : 'Submit issue'}
            </button>
          </form>
        </section>

        <aside className='bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7 h-fit'>
          <h2 className='text-[16px] font-semibold text-slate-900'>
            My submitted issues
          </h2>
          <p className='text-[12.5px] text-slate-500 mt-1'>
            Admin replies will appear here.
          </p>

          <div className='mt-5 space-y-3'>
            {loading ? (
              <p className='text-[13px] text-slate-500'>Loading issues...</p>
            ) : issues.length === 0 ? (
              <p className='text-[13px] text-slate-500'>
                You have not submitted any issues yet.
              </p>
            ) : (
              issues.map((issue) => <IssueCard key={issue._id} issue={issue} />)
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}

function IssueCard({ issue }) {
  return (
    <article className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
      <div className='flex items-start justify-between gap-3'>
        <h3 className='text-[14px] font-semibold text-slate-900 leading-snug'>
          {issue.subject}
        </h3>
        <StatusBadge status={issue.status} />
      </div>
      <p className='text-[12px] text-slate-500 mt-1'>
        {formatCategory(issue.category)} · {formatDate(issue.createdAt)}
      </p>
      <p className='text-[13px] text-slate-700 mt-3 line-clamp-3'>
        {issue.message}
      </p>
      {issue.adminResponse && (
        <div className='mt-3 rounded-lg bg-white border border-emerald-100 p-3'>
          <p className='text-[11.5px] font-semibold text-emerald-700'>
            Admin response
          </p>
          <p className='text-[13px] text-slate-700 mt-1'>
            {issue.adminResponse}
          </p>
        </div>
      )}
    </article>
  );
}

function StatusBadge({ status }) {
  const styles = {
    open: 'bg-blue-50 text-blue-700',
    in_progress: 'bg-amber-50 text-amber-700',
    resolved: 'bg-emerald-50 text-emerald-700',
    closed: 'bg-slate-100 text-slate-600',
  };

  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles[status] || styles.open}`}
    >
      {statusLabels[status] || status}
    </span>
  );
}

function formatCategory(category) {
  return categories.find((item) => item.value === category)?.label || 'Other';
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
