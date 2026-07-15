import { useEffect, useMemo, useState } from 'react';
import { getCareerApplications, updateCareerApplication } from '../api/careerApi';

const statuses = ['new', 'reviewing', 'shortlisted', 'contacted', 'rejected'];

export default function CareerApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setError('');
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      const response = await getCareerApplications(
        params.toString() ? `?${params.toString()}` : ''
      );
      setApplications(response.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load career applications');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    return statuses.reduce((acc, item) => {
      acc[item] = applications.filter((app) => app.status === item).length;
      return acc;
    }, {});
  }, [applications]);

  const patch = async (application, payload) => {
    try {
      const response = await updateCareerApplication(application._id, payload);
      setApplications((current) =>
        current.map((item) =>
          item._id === application._id ? response.data : item
        )
      );
      setSelected(response.data);
      setMessage(response.message || 'Application updated');
    } catch (err) {
      setError(err.message || 'Failed to update application');
    }
  };

  return (
    <section className='page'>
      <div className='page-heading'>
        <div>
          <h1>Career Applications</h1>
          <p>Review interested teachers, mentors, and support applicants.</p>
        </div>
        <button type='button' onClick={load}>Refresh</button>
      </div>

      {message && <p className='archive-success'>{message}</p>}
      {error && <p className='error'>{error}</p>}

      <div className='stats-grid'>
        {statuses.map((item) => (
          <div key={item} className='stat-card'>
            <p>{formatStatus(item)}</p>
            <strong>{stats[item] || 0}</strong>
          </div>
        ))}
      </div>

      <div className='toolbar'>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder='Search name, email, subject, phone'
        />
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value=''>All statuses</option>
          {statuses.map((item) => (
            <option key={item} value={item}>{formatStatus(item)}</option>
          ))}
        </select>
        <button type='button' onClick={load}>Apply</button>
      </div>

      <div className='issue-workspace'>
        <div className='table-wrap'>
          <table>
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Interest</th>
                <th>Availability</th>
                <th>Status</th>
                <th>Applied</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((application) => (
                <tr key={application._id} onClick={() => setSelected(application)}>
                  <td data-label='Applicant'>
                    <strong>{application.name}</strong>
                    <p className='muted-cell'>{application.email}</p>
                    <p className='muted-cell'>{application.phone}</p>
                  </td>
                  <td data-label='Interest'>
                    {application.teachingInterest}
                    <p className='muted-cell'>{application.subjects?.join(', ') || '-'}</p>
                  </td>
                  <td data-label='Availability'>{formatStatus(application.availability)}</td>
                  <td data-label='Status'>
                    <select
                      value={application.status}
                      onChange={(event) =>
                        patch(application, { status: event.target.value })
                      }
                      onClick={(event) => event.stopPropagation()}
                    >
                      {statuses.map((item) => (
                        <option key={item} value={item}>{formatStatus(item)}</option>
                      ))}
                    </select>
                  </td>
                  <td data-label='Applied'>{formatDate(application.createdAt)}</td>
                </tr>
              ))}
              {applications.length === 0 && (
                <tr>
                  <td className='empty-cell' colSpan='5'>No applications found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <ApplicationDetails application={selected} onSave={patch} />
      </div>
    </section>
  );
}

function ApplicationDetails({ application, onSave }) {
  const [note, setNote] = useState('');

  useEffect(() => {
    setNote(application?.adminNote || '');
  }, [application]);

  if (!application) {
    return (
      <aside className='panel issue-detail-panel'>
        <h2>Application details</h2>
        <p className='muted-cell'>Select an application to review details.</p>
      </aside>
    );
  }

  return (
    <aside className='panel issue-detail-panel'>
      <h2>{application.name}</h2>
      <Detail label='Email' value={application.email} />
      <Detail label='Phone' value={application.phone} />
      <Detail label='City' value={application.city || '-'} />
      <Detail label='Qualification' value={application.qualification} />
      <Detail label='Subjects' value={application.subjects?.join(', ') || '-'} />
      <Detail label='Interest' value={application.teachingInterest} />
      <Detail label='Experience' value={formatStatus(application.experience)} />
      <Detail label='Availability' value={formatStatus(application.availability)} />
      <Detail label='Mode' value={formatStatus(application.preferredMode)} />
      <Detail label='Occupation' value={application.currentOccupation || '-'} />
      <Detail label='Expected pay' value={application.expectedPay || '-'} />

      <div className='issue-message'>
        <strong>Message</strong>
        <p>{application.message || '-'}</p>
      </div>

      <label className='field-group'>
        Admin note
        <textarea value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
      <button type='button' onClick={() => onSave(application, { adminNote: note })}>
        Save note
      </button>
    </aside>
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

function formatStatus(value = '') {
  return String(value).replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
