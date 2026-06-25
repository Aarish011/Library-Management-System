import { useState } from 'react';
import { sendNotification } from '../api/notificationApi';

const emptyForm = { title: '', message: '', type: 'info', actionUrl: '', banner: null };

export default function NotificationsPage() {
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (sending) return;

    setStatus('');
    setError('');

    const payload = {
      ...form,
      title: form.title.trim(),
      message: form.message.trim(),
      actionUrl: form.actionUrl.trim(),
    };

    if (!payload.title || !payload.message) {
      setError('Title and message are required.');
      return;
    }

    try {
      setSending(true);
      const response = await sendNotification(payload);
      const meta = response.meta;
      setStatus(
        meta
          ? `Sent to ${meta.created} student${meta.created === 1 ? '' : 's'}. ${meta.skipped} duplicate${meta.skipped === 1 ? '' : 's'} skipped.`
          : 'Notification sent.'
      );
      setForm(emptyForm);
      event.currentTarget.reset();
    } catch (err) {
      setError(err.message || 'Could not send notification.');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className='page'>
      <h1>Notifications</h1>
      <form className='panel form' onSubmit={submit}>
        <input
          placeholder='Title'
          value={form.title}
          onChange={(event) => updateField('title', event.target.value)}
          disabled={sending}
        />
        <textarea
          placeholder='Message'
          value={form.message}
          onChange={(event) => updateField('message', event.target.value)}
          disabled={sending}
        />
        <select
          value={form.type}
          onChange={(event) => updateField('type', event.target.value)}
          disabled={sending}
        >
          <option value='info'>info</option>
          <option value='warning'>warning</option>
          <option value='success'>success</option>
          <option value='error'>error</option>
          <option value='renewal'>renewal</option>
        </select>
        <input
          placeholder='Action URL, optional'
          value={form.actionUrl}
          onChange={(event) => updateField('actionUrl', event.target.value)}
          disabled={sending}
        />
        <label className='field-label'>Notification banner</label>
        <input
          type='file'
          accept='image/*'
          onChange={(event) => updateField('banner', event.target.files?.[0] || null)}
          disabled={sending}
        />
        <button type='submit' disabled={sending}>
          {sending ? 'Sending...' : 'Send to all active students'}
        </button>
        {status && <p className='success'>{status}</p>}
        {error && <p className='error'>{error}</p>}
      </form>
    </section>
  );
}
