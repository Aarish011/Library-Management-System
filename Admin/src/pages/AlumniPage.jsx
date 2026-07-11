import { useEffect, useMemo, useState } from 'react';
import { getAlumni, getAlumniDetails } from '../api/alumniApi';

export default function AlumniPage() {
  const [alumni, setAlumni] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const response = await getAlumni(query);
      setAlumni(response.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load alumni');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    getAlumni()
      .then((response) => {
        if (active) setAlumni(response.data || []);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed to load alumni');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const openDetails = async (record) => {
    try {
      setLoadingDetails(true);
      setError('');
      const response = await getAlumniDetails(record._id);
      setSelected(response.data);
    } catch (err) {
      setError(err.message || 'Failed to load alumni details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const totalRevenue = useMemo(
    () =>
      (selected?.payments || [])
        .filter((payment) => payment.status === 'paid')
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    [selected]
  );

  return (
    <section className='page alumni-page'>
      <div className='page-heading'>
        <div>
          <h1>Alumni</h1>
          <p>Archived student profiles and historical activity.</p>
        </div>
        <span className='audience-count'>{alumni.length} archived</span>
      </div>

      <div className='toolbar'>
        <input
          placeholder='Search name, email or phone'
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') load();
          }}
        />
        <button type='button' onClick={load} disabled={loading}>
          {loading ? 'Loading...' : 'Search'}
        </button>
      </div>

      {error && <p className='error'>{error}</p>}

      <div className='alumni-layout'>
        <div className='table-wrap'>
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Contact</th>
                <th>Preparation</th>
                <th>Archived</th>
                <th>History</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {!loading && alumni.length === 0 ? (
                <tr>
                  <td colSpan='6' className='empty-cell'>
                    No alumni records found
                  </td>
                </tr>
              ) : (
                alumni.map((record) => (
                  <tr key={record._id}>
                    <td>
                      <div className='student-identity'>
                        <Avatar profile={record.profile} />
                        <div>
                          <strong>{record.profile?.name}</strong>
                          <span>{record.profile?.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>{record.profile?.phone || '-'}</td>
                    <td>{record.profile?.preparation || '-'}</td>
                    <td>{formatDate(record.archivedAt)}</td>
                    <td>
                      {record.paymentCount || 0} payments,{' '}
                      {record.reservationCount || 0} reservations
                    </td>
                    <td>
                      <button
                        type='button'
                        className='secondary-button'
                        onClick={() => openDetails(record)}
                        disabled={loadingDetails}
                      >
                        View details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {selected && (
          <AlumniDetails
            record={selected}
            totalRevenue={totalRevenue}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </section>
  );
}

function AlumniDetails({ record, totalRevenue, onClose }) {
  const profile = record.profile || {};

  return (
    <aside className='alumni-details'>
      <div className='alumni-details-header'>
        <div className='student-identity'>
          <Avatar profile={profile} large />
          <div>
            <h2>{profile.name}</h2>
            <span>{profile.email}</span>
          </div>
        </div>
        <button
          type='button'
          className='icon-close'
          aria-label='Close details'
          title='Close details'
          onClick={onClose}
        >
          x
        </button>
      </div>

      <div className='archive-stats'>
        <ArchiveStat label='Paid revenue' value={`Rs. ${totalRevenue.toLocaleString('en-IN')}`} />
        <ArchiveStat label='Payments' value={record.payments?.length || 0} />
        <ArchiveStat label='Reservations' value={record.reservations?.length || 0} />
      </div>

      <DetailSection title='Profile'>
        <DetailRow label='Phone' value={profile.phone} />
        <DetailRow label='Gender' value={capitalize(profile.gender)} />
        <DetailRow label='Preparation' value={profile.preparation} />
        <DetailRow label='Joined' value={formatDate(profile.joinedAt)} />
        <DetailRow label='Last login' value={formatDate(profile.lastLogin)} />
        <DetailRow label='Archived' value={formatDate(record.archivedAt)} />
        <DetailRow
          label='Archived by'
          value={record.archivedBy?.name || record.archivedBy?.email}
        />
      </DetailSection>

      <DetailSection title='Subscriptions'>
        <HistoryItems
          items={record.subscriptions}
          empty='No subscriptions'
          render={(item) => (
            <>
              <strong>{formatPlan(item.plan)}</strong>
              <span>
                {item.status} | Rs. {Number(item.amount || 0).toLocaleString('en-IN')}
              </span>
              <span>
                {formatDate(item.startDate)} to {formatDate(item.endDate)}
              </span>
            </>
          )}
        />
      </DetailSection>

      <DetailSection title='Payments'>
        <HistoryItems
          items={record.payments}
          empty='No payments'
          render={(item) => (
            <>
              <strong>
                Rs. {Number(item.amount || 0).toLocaleString('en-IN')} - {item.status}
              </strong>
              <span>{formatMethod(item.paymentMethod)}</span>
              <span>
                {item.referenceId || item.razorpayPaymentId || 'No reference'} |{' '}
                {formatDate(item.paymentDate || item.createdAt)}
              </span>
            </>
          )}
        />
      </DetailSection>

      <DetailSection title='Seat history'>
        <HistoryItems
          items={record.reservations}
          empty='No reservations'
          render={(item) => (
            <>
              <strong>Seat {item.seat?.seatNumber || '-'}</strong>
              <span>{formatPlan(item.plan)} | {item.status}</span>
              <span>{formatDate(item.reservedAt || item.createdAt)}</span>
            </>
          )}
        />
      </DetailSection>
    </aside>
  );
}

function Avatar({ profile, large = false }) {
  if (profile?.profilePicture) {
    return (
      <img
        className={`alumni-avatar ${large ? 'large' : ''}`}
        src={profile.profilePicture}
        alt={profile.name || 'Student'}
      />
    );
  }

  const initials = (profile?.name || 'S')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span className={`alumni-avatar initials ${large ? 'large' : ''}`}>
      {initials}
    </span>
  );
}

function ArchiveStat({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DetailSection({ title, children }) {
  return (
    <section className='archive-section'>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className='detail-row'>
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  );
}

function HistoryItems({ items = [], empty, render }) {
  if (!items.length) return <p className='archive-empty'>{empty}</p>;
  return (
    <div className='archive-history'>
      {items.map((item, index) => (
        <article key={item._id || index}>{render(item)}</article>
      ))}
    </div>
  );
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatPlan(plan) {
  if (plan === 'library_access') return 'General Seat';
  if (plan === 'reserved_seat') return 'Reserved Seat';
  return plan || 'Unknown plan';
}

function formatMethod(method) {
  return method === 'pay_on_desk' ? 'Pay on Desk' : 'Razorpay';
}

function capitalize(value = '') {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : '-';
}
