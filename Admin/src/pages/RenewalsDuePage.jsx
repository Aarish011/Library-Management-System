import { useEffect, useMemo, useState } from 'react';
import { getRenewalsDue } from '../api/subscriptionApi';

export default function RenewalsDuePage() {
  const [renewals, setRenewals] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getRenewalsDue();
      setRenewals(response.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load renewals due');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    getRenewalsDue()
      .then((response) => {
        if (active) setRenewals(response.data || []);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed to load renewals due');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      getRenewalsDue()
        .then((response) => {
          if (active) setRenewals(response.data || []);
        })
        .catch(() => {});
    };

    const intervalId = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const filteredRenewals = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return renewals;
    return renewals.filter((renewal) => {
      const student = renewal.user || {};
      return [student.name, student.email, student.phone]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [renewals, search]);

  const overdueCount = renewals.filter((renewal) => renewal.isOverdue).length;
  const urgentCount = renewals.filter(
    (renewal) =>
      !renewal.isOverdue &&
      renewal.hoursRemaining >= 0 &&
      renewal.hoursRemaining <= 24
  ).length;

  return (
    <section className='page renewals-page'>
      <div className='page-heading'>
        <div>
          <h1>Renewals Due</h1>
          <p>Due soon and unpaid expired memberships. Updates automatically.</p>
        </div>
        <button type='button' onClick={load} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className='renewal-summary'>
        <SummaryItem
          label='Renewal queue'
          value={renewals.length}
          tone='neutral'
        />
        <SummaryItem
          label='Overdue'
          value={overdueCount}
          tone='urgent'
        />
        <SummaryItem
          label='Due within 24 hours'
          value={urgentCount}
          tone='warning'
        />
        <SummaryItem
          label='Contactable'
          value={renewals.filter((item) => item.user?.email || item.user?.phone).length}
          tone='success'
        />
      </div>

      <div className='toolbar'>
        <input
          placeholder='Search name, email or phone'
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {error && <p className='error'>{error}</p>}

      <div className='table-wrap renewal-table'>
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Contact</th>
              <th>Plan</th>
              <th>Seat</th>
              <th>Expires</th>
              <th>Time left</th>
              <th>Contact student</th>
            </tr>
          </thead>
          <tbody>
            {!loading && filteredRenewals.length === 0 ? (
              <tr>
                <td colSpan='7' className='empty-cell'>
                  No students currently need renewal
                </td>
              </tr>
            ) : (
              filteredRenewals.map((renewal) => (
                <RenewalRow key={renewal._id} renewal={renewal} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RenewalRow({ renewal }) {
  const student = renewal.user || {};
  const emailHref = buildEmailLink(student, renewal);
  const whatsappHref = buildWhatsAppLink(student, renewal);

  return (
    <tr>
      <td>
        <div className='student-identity'>
          <ContactAvatar student={student} />
          <div>
            <strong>{student.name || '-'}</strong>
            <span>{student.preparation || 'Student'}</span>
          </div>
        </div>
      </td>
      <td>
        <div className='contact-details'>
          <span>{student.email || '-'}</span>
          <span>{student.phone || '-'}</span>
        </div>
      </td>
      <td>{formatPlan(renewal.plan)}</td>
      <td>{renewal.seat?.seatNumber || '-'}</td>
      <td>{formatDateTime(renewal.endDate)}</td>
      <td>
        <span
          className={`renewal-deadline ${
            renewal.isOverdue
              ? 'overdue'
              : renewal.hoursRemaining <= 24
                ? 'urgent'
                : ''
          }`}
        >
          {formatTimeLeft(renewal.hoursRemaining)}
        </span>
      </td>
      <td>
        <div className='contact-actions'>
          <a
            className={`contact-button email ${!student.email ? 'disabled' : ''}`}
            href={student.email ? emailHref : undefined}
            aria-disabled={!student.email}
          >
            Email
          </a>
          <a
            className={`contact-button whatsapp ${!whatsappHref ? 'disabled' : ''}`}
            href={whatsappHref || undefined}
            target='_blank'
            rel='noreferrer'
            aria-disabled={!whatsappHref}
          >
            WhatsApp
          </a>
        </div>
      </td>
    </tr>
  );
}

function SummaryItem({ label, value, tone }) {
  return (
    <div className={`renewal-summary-item ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ContactAvatar({ student }) {
  if (student.profilePicture) {
    return (
      <img
        className='alumni-avatar'
        src={student.profilePicture}
        alt={student.name || 'Student'}
      />
    );
  }
  const initials = (student.name || 'S')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return <span className='alumni-avatar initials'>{initials}</span>;
}

function buildEmailLink(student, renewal) {
  const subject = 'Your library membership renewal is due';
  const body = contactMessage(student, renewal);
  return `mailto:${student.email}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
}

function buildWhatsAppLink(student, renewal) {
  const phone = normalizePhone(student.phone);
  if (!phone) return '';
  return `https://wa.me/${phone}?text=${encodeURIComponent(
    contactMessage(student, renewal)
  )}`;
}

function contactMessage(student, renewal) {
  const expiryText = renewal.isOverdue
    ? `expired on ${formatDateTime(renewal.endDate)}`
    : `expires on ${formatDateTime(renewal.endDate)}`;
  return `Hello ${student.name || 'Student'},\n\nYour library membership for ${formatPlan(
    renewal.plan
  )} ${expiryText}. Please renew your subscription to continue your library access.\n\nThank you,\nBookshelf Library`;
}

function normalizePhone(value = '') {
  let digits = String(value).replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length === 10) digits = `91${digits}`;
  return digits.length >= 11 && digits.length <= 15 ? digits : '';
}

function formatTimeLeft(hours) {
  if (hours < 0) {
    const overdueHours = Math.abs(hours);
    if (overdueHours < 24) return `Overdue by ${overdueHours} hours`;
    return `Overdue by ${Math.ceil(overdueHours / 24)} days`;
  }
  if (hours <= 1) return 'Less than 1 hour';
  if (hours <= 24) return `${hours} hours`;
  return `${Math.ceil(hours / 24)} days`;
}

function formatDateTime(value) {
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatPlan(plan) {
  return plan === 'library_access' ? 'General Seat' : 'Reserved Seat';
}
