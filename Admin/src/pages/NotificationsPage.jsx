import { useEffect, useMemo, useState } from 'react';
import {
  getNotificationHistory,
  sendNotification,
} from '../api/notificationApi';
import { getStudents } from '../api/studentApi';

const emptyForm = {
  audience: 'all',
  userId: '',
  title: '',
  message: '',
  type: 'info',
  banner: null,
};

const typeLabels = {
  info: 'Information',
  warning: 'Important',
  success: 'Success',
  error: 'Urgent',
  renewal: 'Renewal',
};

export default function NotificationsPage() {
  const [form, setForm] = useState(emptyForm);
  const [students, setStudents] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [fileKey, setFileKey] = useState(0);

  const bannerPreview = useMemo(
    () => (form.banner ? URL.createObjectURL(form.banner) : ''),
    [form.banner]
  );

  useEffect(
    () => () => {
      if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    },
    [bannerPreview]
  );

  const loadPage = async () => {
    try {
      setLoading(true);
      setError('');
      const [studentResponse, historyResponse] = await Promise.all([
        getStudents('?status=active'),
        getNotificationHistory(),
      ]);
      setStudents(studentResponse.data || []);
      setHistory(historyResponse.data || []);
    } catch (err) {
      setError(err.message || 'Could not load notification center.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      getStudents('?status=active'),
      getNotificationHistory(),
    ])
      .then(([studentResponse, historyResponse]) => {
        if (!active) return;
        setStudents(studentResponse.data || []);
        setHistory(historyResponse.data || []);
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'Could not load notification center.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setStatus('');
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    if (sending) return;

    const title = form.title.trim();
    const message = form.message.trim();
    if (!title || !message) {
      setError('Title and message are required.');
      return;
    }
    if (form.audience === 'single' && !form.userId) {
      setError('Select a student.');
      return;
    }
    if (form.banner && form.banner.size > 5 * 1024 * 1024) {
      setError('Banner image must be smaller than 5 MB.');
      return;
    }

    try {
      setSending(true);
      const response = await sendNotification({
        title,
        message,
        type: form.type,
        userId: form.audience === 'single' ? form.userId : '',
        banner: form.banner,
      });
      const meta = response.meta;
      setStatus(
        `Sent to ${meta?.created || 0} student${
          meta?.created === 1 ? '' : 's'
        }. ${meta?.skipped || 0} duplicate${
          meta?.skipped === 1 ? '' : 's'
        } skipped.`
      );
      setForm(emptyForm);
      setFileKey((value) => value + 1);
      const historyResponse = await getNotificationHistory();
      setHistory(historyResponse.data || []);
    } catch (err) {
      setError(err.message || 'Could not send notification.');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className='page notification-center'>
      <div className='page-heading'>
        <div>
          <h1>Notification Center</h1>
          <p>Compose updates and review delivery across active students.</p>
        </div>
        <span className='audience-count'>{students.length} active students</span>
      </div>

      <div className='notification-workspace'>
        <form className='panel notification-composer' onSubmit={submit}>
          <div className='panel-heading'>
            <div>
              <h2>New notification</h2>
              <p>Choose the audience and message priority.</p>
            </div>
            <span className={`type-chip type-${form.type}`}>
              {typeLabels[form.type]}
            </span>
          </div>

          <fieldset className='audience-switch'>
            <legend>Audience</legend>
            <button
              type='button'
              className={form.audience === 'all' ? 'selected' : ''}
              onClick={() => updateField('audience', 'all')}
            >
              All active students
            </button>
            <button
              type='button'
              className={form.audience === 'single' ? 'selected' : ''}
              onClick={() => updateField('audience', 'single')}
            >
              One student
            </button>
          </fieldset>

          {form.audience === 'single' && (
            <label className='field-group'>
              <span>Student</span>
              <select
                value={form.userId}
                onChange={(event) => updateField('userId', event.target.value)}
                disabled={sending}
              >
                <option value=''>Select a student</option>
                {students.map((student) => (
                  <option key={student._id} value={student._id}>
                    {student.name} - {student.email}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className='composer-row'>
            <label className='field-group'>
              <span>Type</span>
              <select
                value={form.type}
                onChange={(event) => updateField('type', event.target.value)}
                disabled={sending}
              >
                {Object.entries(typeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className='field-group'>
              <span>Title</span>
              <input
                value={form.title}
                maxLength={100}
                onChange={(event) => updateField('title', event.target.value)}
                disabled={sending}
                placeholder='Notification title'
              />
            </label>
          </div>

          <label className='field-group'>
            <span>Message</span>
            <textarea
              value={form.message}
              maxLength={1000}
              onChange={(event) => updateField('message', event.target.value)}
              disabled={sending}
              placeholder='Write the notification message'
            />
            <small>{form.message.length}/1000</small>
          </label>

          <label className='banner-upload'>
            <span>Banner image</span>
            <input
              key={fileKey}
              type='file'
              accept='image/*'
              onChange={(event) =>
                updateField('banner', event.target.files?.[0] || null)
              }
              disabled={sending}
            />
            <small>PNG, JPG or WebP, maximum 5 MB</small>
          </label>

          {bannerPreview && (
            <div className='banner-preview'>
              <img src={bannerPreview} alt='Notification banner preview' />
              <button
                type='button'
                aria-label='Remove banner'
                title='Remove banner'
                onClick={() => {
                  updateField('banner', null);
                  setFileKey((value) => value + 1);
                }}
              >
                x
              </button>
            </div>
          )}

          {status && <p className='success notice-message'>{status}</p>}
          {error && <p className='error notice-message'>{error}</p>}

          <div className='composer-actions'>
            <span>
              {form.audience === 'all'
                ? `${students.length} recipients`
                : form.userId
                  ? '1 recipient'
                  : 'No recipient selected'}
            </span>
            <button type='submit' disabled={sending}>
              {sending ? 'Sending...' : 'Send notification'}
            </button>
          </div>
        </form>

        <aside className='panel notification-preview'>
          <h2>Student preview</h2>
          {bannerPreview && (
            <img src={bannerPreview} alt='' className='preview-banner' />
          )}
          <span className={`type-chip type-${form.type}`}>
            {typeLabels[form.type]}
          </span>
          <h3>{form.title || 'Notification title'}</h3>
          <p>{form.message || 'Your message will appear here.'}</p>
          <time>Just now</time>
        </aside>
      </div>

      <section className='panel notification-history'>
        <div className='panel-heading'>
          <div>
            <h2>Sent history</h2>
            <p>Latest administrator broadcasts and read activity.</p>
          </div>
          <button
            type='button'
            className='secondary-button'
            onClick={loadPage}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {history.length === 0 && !loading ? (
          <p className='empty-history'>No administrator notifications sent yet.</p>
        ) : (
          <div className='history-list'>
            {history.map((item) => {
              const readPercent = item.recipients
                ? Math.round((item.readCount / item.recipients) * 100)
                : 0;
              return (
                <article key={item._id} className='history-item'>
                  {item.bannerUrl && (
                    <img src={item.bannerUrl} alt='' className='history-banner' />
                  )}
                  <div className='history-content'>
                    <div className='history-title-row'>
                      <span className={`type-chip type-${item.type}`}>
                        {typeLabels[item.type] || item.type}
                      </span>
                      <time>{formatDate(item.createdAt)}</time>
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.message}</p>
                  </div>
                  <div className='delivery-stats'>
                    <strong>
                      {item.readCount}/{item.recipients}
                    </strong>
                    <span>Read ({readPercent}%)</span>
                    <div>
                      <i style={{ width: `${readPercent}%` }} />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}
