import { useEffect, useMemo, useState } from 'react';
import { getIssues, updateIssue } from '../api/issueApi';
import DataTable from '../components/common/DataTable';

const statuses = [
  { value: '', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const categories = [
  { value: '', label: 'All categories' },
  { value: 'seat', label: 'Seat' },
  { value: 'payment', label: 'Payment' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'profile', label: 'Profile' },
  { value: 'facility', label: 'Facility' },
  { value: 'other', label: 'Other' },
];

const priorities = ['low', 'medium', 'high', 'urgent'];

export default function IssuesPage() {
  const [issues, setIssues] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    category: '',
  });
  const [selected, setSelected] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const summary = useMemo(
    () => ({
      total: issues.length,
      open: issues.filter((issue) => issue.status === 'open').length,
      urgent: issues.filter((issue) => issue.priority === 'urgent').length,
    }),
    [issues]
  );

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      const params = new URLSearchParams();
      if (filters.search.trim()) params.set('search', filters.search.trim());
      if (filters.status) params.set('status', filters.status);
      if (filters.category) params.set('category', filters.category);
      params.set('limit', '100');
      const response = await getIssues(`?${params.toString()}`);
      setIssues(response.data?.issues || []);
    } catch (err) {
      setError(err.message || 'Failed to load issues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filters.status, filters.category]);

  const selectIssue = (issue) => {
    setSelected(issue);
    setResponseText(issue.adminResponse || '');
    setError('');
    setSuccess('');
  };

  const patchIssue = async (issue, payload) => {
    try {
      setSavingId(issue._id);
      setError('');
      setSuccess('');
      const response = await updateIssue(issue._id, payload);
      const updated = response.data;
      setIssues((current) =>
        current.map((item) => (item._id === updated._id ? updated : item))
      );
      if (selected?._id === updated._id) {
        setSelected(updated);
        setResponseText(updated.adminResponse || '');
      }
      setSuccess(response.message || 'Issue updated successfully');
    } catch (err) {
      setError(err.message || 'Failed to update issue');
    } finally {
      setSavingId('');
    }
  };

  const saveResponse = async () => {
    if (!selected) return;
    await patchIssue(selected, {
      adminResponse: responseText,
      status: selected.status === 'open' ? 'in_progress' : selected.status,
    });
  };

  const resetFilters = () => {
    setFilters({ search: '', status: '', category: '' });
  };

  return (
    <section className='page'>
      <div className='page-heading'>
        <div>
          <h1>Student Issues</h1>
          <p>Review problems raised by students and update their resolution status.</p>
        </div>
      </div>

      <div className='stats-grid issue-stats'>
        <div className='stat-card'>
          <p>Total visible</p>
          <strong>{summary.total}</strong>
          <span>Matching current filters</span>
        </div>
        <div className='stat-card'>
          <p>Open</p>
          <strong>{summary.open}</strong>
          <span>Needs attention</span>
        </div>
        <div className='stat-card'>
          <p>Urgent</p>
          <strong>{summary.urgent}</strong>
          <span>High priority queue</span>
        </div>
      </div>

      <div className='toolbar'>
        <input
          placeholder='Search subject or message'
          value={filters.search}
          onChange={(event) =>
            setFilters((current) => ({ ...current, search: event.target.value }))
          }
          onKeyDown={(event) => {
            if (event.key === 'Enter') load();
          }}
        />
        <select
          value={filters.status}
          onChange={(event) =>
            setFilters((current) => ({ ...current, status: event.target.value }))
          }
        >
          {statuses.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
        <select
          value={filters.category}
          onChange={(event) =>
            setFilters((current) => ({ ...current, category: event.target.value }))
          }
        >
          {categories.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
        <button type='button' onClick={load}>
          Search
        </button>
        <button type='button' className='secondary-button' onClick={resetFilters}>
          Reset
        </button>
      </div>

      {error && <p className='error'>{error}</p>}
      {success && <p className='success'>{success}</p>}

      {loading ? (
        <p className='loader'>Loading issues...</p>
      ) : (
        <div className='issue-workspace'>
          <DataTable
            empty='No issues found'
            columns={[
              {
                key: 'student',
                label: 'Student',
                render: (issue) => (
                  <div>
                    <strong>{issue.user?.name || '-'}</strong>
                    <p className='muted-cell'>{issue.user?.email || '-'}</p>
                  </div>
                ),
              },
              { key: 'subject', label: 'Subject' },
              {
                key: 'category',
                label: 'Category',
                render: (issue) => formatLabel(issue.category),
              },
              {
                key: 'priority',
                label: 'Priority',
                render: (issue) => (
                  <select
                    value={issue.priority}
                    disabled={savingId === issue._id}
                    onChange={(event) =>
                      patchIssue(issue, { priority: event.target.value })
                    }
                  >
                    {priorities.map((priority) => (
                      <option key={priority} value={priority}>
                        {formatLabel(priority)}
                      </option>
                    ))}
                  </select>
                ),
              },
              {
                key: 'status',
                label: 'Status',
                render: (issue) => (
                  <select
                    value={issue.status}
                    disabled={savingId === issue._id}
                    onChange={(event) =>
                      patchIssue(issue, { status: event.target.value })
                    }
                  >
                    {statuses
                      .filter((status) => status.value)
                      .map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                  </select>
                ),
              },
              {
                key: 'createdAt',
                label: 'Raised',
                render: (issue) => formatDate(issue.createdAt),
              },
              {
                key: 'actions',
                label: 'Actions',
                render: (issue) => (
                  <button
                    type='button'
                    className='secondary-button'
                    onClick={() => selectIssue(issue)}
                  >
                    View
                  </button>
                ),
              },
            ]}
            rows={issues}
          />

          <IssueDetails
            issue={selected}
            responseText={responseText}
            saving={savingId === selected?._id}
            onResponseChange={setResponseText}
            onSaveResponse={saveResponse}
          />
        </div>
      )}
    </section>
  );
}

function IssueDetails({
  issue,
  responseText,
  saving,
  onResponseChange,
  onSaveResponse,
}) {
  if (!issue) {
    return (
      <aside className='panel issue-detail-panel'>
        <h2>Issue details</h2>
        <p className='muted-cell'>Select an issue to read the full message and reply.</p>
      </aside>
    );
  }

  return (
    <aside className='panel issue-detail-panel'>
      <div className='panel-heading'>
        <div>
          <h2>{issue.subject}</h2>
          <p>{formatLabel(issue.category)} · {formatDate(issue.createdAt)}</p>
        </div>
      </div>

      <div className='student-mini-card'>
        {issue.user?.profilePicture ? (
          <img src={issue.user.profilePicture} alt={issue.user.name || 'Student'} />
        ) : (
          <span>{getInitials(issue.user?.name)}</span>
        )}
        <div>
          <strong>{issue.user?.name || 'Student'}</strong>
          <p>{issue.user?.phone || '-'} · {issue.user?.preparation || '-'}</p>
          <p>{issue.user?.email || '-'}</p>
        </div>
      </div>

      <div className='issue-message'>
        <strong>Student message</strong>
        <p>{issue.message}</p>
      </div>

      <label className='field-group'>
        Admin response
        <textarea
          value={responseText}
          onChange={(event) => onResponseChange(event.target.value)}
          placeholder='Write a clear update for the student.'
          maxLength={2000}
        />
      </label>

      <button type='button' disabled={saving} onClick={onSaveResponse}>
        {saving ? 'Saving...' : 'Save response'}
      </button>
    </aside>
  );
}

function formatLabel(value) {
  if (!value) return '-';
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getInitials(name = 'S') {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
