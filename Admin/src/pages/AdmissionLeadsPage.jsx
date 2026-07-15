import { useEffect, useMemo, useState } from 'react';
import {
  createAdmissionLead,
  getAdmissionLeads,
  updateAdmissionLead,
} from '../api/admissionLeadApi';

const statuses = ['demo_taken', 'interested', 'follow_up', 'admitted', 'not_interested'];
const preparations = ['UPSC', 'JEE', 'GATE', 'NEET', 'CAT', 'Banking', 'SSC', 'Other'];
const seatTypes = ['general', 'reserved', 'any'];
const slots = ['morning', 'evening', 'whole_day', 'any'];
const sources = ['walk_in', 'referral', 'phone_call', 'website', 'social_media', 'other'];

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  city: '',
  preparation: '',
  demoDate: '',
  expectedJoinDate: '',
  followUpDate: '',
  preferredSeatType: 'any',
  preferredSlot: 'any',
  lockerInterested: false,
  source: 'walk_in',
  status: 'demo_taken',
  guardianName: '',
  guardianPhone: '',
  notes: '',
};

export default function AdmissionLeadsPage() {
  const [leads, setLeads] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [preparation, setPreparation] = useState('');
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setError('');
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (status) params.set('status', status);
      if (preparation) params.set('preparation', preparation);
      const response = await getAdmissionLeads(
        params.toString() ? `?${params.toString()}` : ''
      );
      setLeads(response.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load admission leads');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    return statuses.reduce((acc, item) => {
      acc[item] = leads.filter((lead) => lead.status === item).length;
      return acc;
    }, {});
  }, [leads]);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError('');
      setMessage('');
      const response = await createAdmissionLead(form);
      setForm(emptyForm);
      setSelected(response.data);
      setMessage(response.message || 'Admission lead saved successfully');
      await load();
    } catch (err) {
      setError(err.message || 'Failed to save admission lead');
    } finally {
      setSaving(false);
    }
  };

  const patch = async (lead, payload) => {
    try {
      setError('');
      setMessage('');
      const response = await updateAdmissionLead(lead._id, payload);
      setLeads((current) =>
        current.map((item) => (item._id === lead._id ? response.data : item))
      );
      setSelected(response.data);
      setMessage(response.message || 'Admission lead updated');
    } catch (err) {
      setError(err.message || 'Failed to update admission lead');
    }
  };

  return (
    <section className='page'>
      <div className='page-heading'>
        <div>
          <h1>Admission Leads</h1>
          <p>Store demo visitors and interested students before admission.</p>
        </div>
        <button type='button' onClick={load}>Refresh</button>
      </div>

      {message && <p className='archive-success'>{message}</p>}
      {error && <p className='error'>{error}</p>}

      <div className='stats-grid'>
        {statuses.map((item) => (
          <div key={item} className='stat-card'>
            <p>{formatLabel(item)}</p>
            <strong>{stats[item] || 0}</strong>
          </div>
        ))}
      </div>

      <form className='panel admission-form' onSubmit={submit}>
        <div className='panel-heading'>
          <div>
            <h2>Add demo student</h2>
            <p>Record library demo, plan interest, follow-up date, and notes.</p>
          </div>
        </div>

        <div className='admission-form-grid'>
          <Field label='Student name *'>
            <input value={form.name} onChange={(event) => updateForm('name', event.target.value)} required />
          </Field>
          <Field label='Phone number *'>
            <input
              value={form.phone}
              onChange={(event) =>
                updateForm('phone', event.target.value.replace(/\D/g, '').slice(0, 10))
              }
              required
              minLength={10}
              maxLength={10}
            />
          </Field>
          <Field label='Email'>
            <input type='email' value={form.email} onChange={(event) => updateForm('email', event.target.value)} />
          </Field>
          <Field label='City / Area'>
            <input value={form.city} onChange={(event) => updateForm('city', event.target.value)} />
          </Field>
          <Field label='Preparation'>
            <select value={form.preparation} onChange={(event) => updateForm('preparation', event.target.value)}>
              <option value=''>Select preparation</option>
              {preparations.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>
          <Field label='Demo date'>
            <input type='date' value={form.demoDate} onChange={(event) => updateForm('demoDate', event.target.value)} />
          </Field>
          <Field label='Expected joining'>
            <input type='date' value={form.expectedJoinDate} onChange={(event) => updateForm('expectedJoinDate', event.target.value)} />
          </Field>
          <Field label='Follow-up date'>
            <input type='date' value={form.followUpDate} onChange={(event) => updateForm('followUpDate', event.target.value)} />
          </Field>
          <Field label='Seat interest'>
            <select value={form.preferredSeatType} onChange={(event) => updateForm('preferredSeatType', event.target.value)}>
              {seatTypes.map((item) => <option key={item} value={item}>{formatLabel(item)}</option>)}
            </select>
          </Field>
          <Field label='Preferred slot'>
            <select value={form.preferredSlot} onChange={(event) => updateForm('preferredSlot', event.target.value)}>
              {slots.map((item) => <option key={item} value={item}>{formatLabel(item)}</option>)}
            </select>
          </Field>
          <Field label='Source'>
            <select value={form.source} onChange={(event) => updateForm('source', event.target.value)}>
              {sources.map((item) => <option key={item} value={item}>{formatLabel(item)}</option>)}
            </select>
          </Field>
          <Field label='Status'>
            <select value={form.status} onChange={(event) => updateForm('status', event.target.value)}>
              {statuses.map((item) => <option key={item} value={item}>{formatLabel(item)}</option>)}
            </select>
          </Field>
          <Field label='Guardian name'>
            <input value={form.guardianName} onChange={(event) => updateForm('guardianName', event.target.value)} />
          </Field>
          <Field label='Guardian phone'>
            <input
              value={form.guardianPhone}
              onChange={(event) =>
                updateForm('guardianPhone', event.target.value.replace(/\D/g, '').slice(0, 10))
              }
              maxLength={10}
            />
          </Field>
          <label className='admission-checkbox'>
            <input
              type='checkbox'
              checked={form.lockerInterested}
              onChange={(event) => updateForm('lockerInterested', event.target.checked)}
            />
            Interested in locker
          </label>
        </div>

        <Field label='Library notes'>
          <textarea
            value={form.notes}
            onChange={(event) => updateForm('notes', event.target.value)}
            placeholder='Demo feedback, budget, preferred seat, follow-up discussion...'
          />
        </Field>

        <div className='composer-actions'>
          <span>Only admins can see and manage these records.</span>
          <button type='submit' disabled={saving}>
            {saving ? 'Saving...' : 'Save lead'}
          </button>
        </div>
      </form>

      <div className='toolbar'>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder='Search name, phone, email, guardian'
        />
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value=''>All statuses</option>
          {statuses.map((item) => <option key={item} value={item}>{formatLabel(item)}</option>)}
        </select>
        <select value={preparation} onChange={(event) => setPreparation(event.target.value)}>
          <option value=''>All preparations</option>
          {preparations.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <button type='button' onClick={load}>Apply</button>
      </div>

      <div className='issue-workspace'>
        <div className='table-wrap'>
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Interest</th>
                <th>Demo</th>
                <th>Follow-up</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead._id} onClick={() => setSelected(lead)}>
                  <td data-label='Student'>
                    <strong>{lead.name}</strong>
                    <p className='muted-cell'>{lead.phone}</p>
                    <p className='muted-cell'>{lead.email || '-'}</p>
                  </td>
                  <td data-label='Interest'>
                    {formatLabel(lead.preferredSeatType || 'any')}
                    <p className='muted-cell'>{formatLabel(lead.preferredSlot || 'any')}</p>
                    <p className='muted-cell'>{lead.preparation || '-'}</p>
                  </td>
                  <td data-label='Demo'>{formatDate(lead.demoDate)}</td>
                  <td data-label='Follow-up'>{formatDate(lead.followUpDate)}</td>
                  <td data-label='Status'>
                    <select
                      value={lead.status}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => patch(lead, { status: event.target.value })}
                    >
                      {statuses.map((item) => <option key={item} value={item}>{formatLabel(item)}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td className='empty-cell' colSpan='5'>No admission leads found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <LeadDetails lead={selected} onSave={patch} />
      </div>
    </section>
  );
}

function LeadDetails({ lead, onSave }) {
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [expectedJoinDate, setExpectedJoinDate] = useState('');

  useEffect(() => {
    setNotes(lead?.notes || '');
    setFollowUpDate(toInputDate(lead?.followUpDate));
    setExpectedJoinDate(toInputDate(lead?.expectedJoinDate));
  }, [lead]);

  if (!lead) {
    return (
      <aside className='panel issue-detail-panel'>
        <h2>Lead details</h2>
        <p className='muted-cell'>Select a demo student to review details.</p>
      </aside>
    );
  }

  return (
    <aside className='panel issue-detail-panel'>
      <h2>{lead.name}</h2>
      <Detail label='Phone' value={lead.phone} />
      <Detail label='Email' value={lead.email || '-'} />
      <Detail label='City' value={lead.city || '-'} />
      <Detail label='Preparation' value={lead.preparation || '-'} />
      <Detail label='Seat interest' value={formatLabel(lead.preferredSeatType || 'any')} />
      <Detail label='Slot interest' value={formatLabel(lead.preferredSlot || 'any')} />
      <Detail label='Locker' value={lead.lockerInterested ? 'Interested' : 'Not interested'} />
      <Detail label='Source' value={formatLabel(lead.source || '-')} />
      <Detail label='Guardian' value={lead.guardianName || '-'} />
      <Detail label='Guardian phone' value={lead.guardianPhone || '-'} />
      <Detail label='Demo date' value={formatDate(lead.demoDate)} />
      <Detail label='Created' value={formatDate(lead.createdAt)} />

      <label className='field-group'>
        Expected joining
        <input
          type='date'
          value={expectedJoinDate}
          onChange={(event) => setExpectedJoinDate(event.target.value)}
        />
      </label>
      <label className='field-group'>
        Follow-up date
        <input
          type='date'
          value={followUpDate}
          onChange={(event) => setFollowUpDate(event.target.value)}
        />
      </label>
      <label className='field-group'>
        Notes
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>
      <button
        type='button'
        onClick={() =>
          onSave(lead, {
            notes,
            followUpDate,
            expectedJoinDate,
          })
        }
      >
        Save follow-up
      </button>
    </aside>
  );
}

function Field({ label, children }) {
  return (
    <label className='field-group'>
      {label}
      {children}
    </label>
  );
}

function Detail({ label, value }) {
  return (
    <div className='detail-row'>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatLabel(value = '') {
  return String(value || '-')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function toInputDate(value) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}
