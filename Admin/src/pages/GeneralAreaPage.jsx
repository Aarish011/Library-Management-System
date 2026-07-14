import { useEffect, useMemo, useState } from 'react';
import {
  cancelGeneralAreaBooking,
  changeGeneralAreaBookingSlot,
  getGeneralAreaOverview,
  updateGeneralAreaSettings,
} from '../api/generalAreaApi';

const slotLabels = {
  morning: 'Morning',
  evening: 'Evening',
  wholeDay: 'Whole Day',
};

export default function GeneralAreaPage() {
  const [data, setData] = useState(null);
  const [settings, setSettings] = useState(null);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setError('');
      const response = await getGeneralAreaOverview();
      setData(response.data);
      setSettings({
        bookingEnabled: response.data.bookingEnabled,
        slots: Object.fromEntries(
          response.data.slots.map((slot) => [
            slot.slot,
            { capacity: slot.capacity, isOpen: slot.isOpen },
          ])
        ),
      });
    } catch (err) {
      setError(err.message || 'Failed to load general area');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();
    const bookings = data?.activeBookings || [];
    if (!query) return bookings;
    return bookings.filter((booking) => {
      const user = booking.user || {};
      return [user.name, user.email, user.phone, user.preparation]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [data, search]);

  const saveSettings = async () => {
    try {
      setSaving(true);
      setError('');
      setMessage('');
      await updateGeneralAreaSettings(settings);
      setMessage('General area settings updated');
      await load();
    } catch (err) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSlot = (slot, key, value) => {
    setSettings((current) => ({
      ...current,
      slots: {
        ...current.slots,
        [slot]: {
          ...current.slots[slot],
          [key]: value,
        },
      },
    }));
  };

  if (!data || !settings) {
    return <section className='page'><h1>General Area Management</h1><p className='loader'>Loading...</p></section>;
  }

  return (
    <section className='page'>
      <div className='page-heading'>
        <div>
          <h1>General Area Management</h1>
          <p>Manage flexible seat slot capacities and active general-area students.</p>
        </div>
        <button type='button' disabled={saving} onClick={saveSettings}>
          {saving ? 'Saving...' : 'Save settings'}
        </button>
      </div>

      {message && <p className='archive-success'>{message}</p>}
      {error && <p className='error'>{error}</p>}

      <div className='panel'>
        <label className='field-group'>
          <span>Global booking</span>
          <select
            value={settings.bookingEnabled ? 'open' : 'closed'}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                bookingEnabled: event.target.value === 'open',
              }))
            }
          >
            <option value='open'>Enabled</option>
            <option value='closed'>Disabled</option>
          </select>
        </label>
      </div>

      <div className='stats-grid'>
        {data.slots.map((slot) => (
          <div key={slot.slot} className='stat-card'>
            <p>{slot.label}</p>
            <strong>{slot.remaining}</strong>
            <span>
              Capacity {slot.capacity} | Booked {slot.booked} |{' '}
              {slot.isOpen ? 'Open' : 'Closed'}
            </span>
          </div>
        ))}
      </div>

      <div className='panel-grid'>
        {data.slots.map((slot) => (
          <div key={slot.slot} className='panel'>
            <h2>{slot.label}</h2>
            <div className='form'>
              <label className='field-group'>
                <span>Capacity</span>
                <input
                  type='number'
                  min='0'
                  value={settings.slots[slot.slot]?.capacity ?? 0}
                  onChange={(event) =>
                    updateSlot(slot.slot, 'capacity', Number(event.target.value))
                  }
                />
              </label>
              <label className='field-group'>
                <span>Status</span>
                <select
                  value={settings.slots[slot.slot]?.isOpen ? 'open' : 'closed'}
                  onChange={(event) =>
                    updateSlot(slot.slot, 'isOpen', event.target.value === 'open')
                  }
                >
                  <option value='open'>Open</option>
                  <option value='closed'>Temporarily Closed</option>
                </select>
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className='table-wrap'>
        <div className='panel-heading' style={{ padding: 18 }}>
          <div>
            <h2>Active General Area Students</h2>
            <p>Search, cancel bookings, or change a student's slot.</p>
          </div>
          <input
            style={{ maxWidth: 320 }}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder='Search students'
          />
        </div>
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Slot</th>
              <th>Phone</th>
              <th>Subscription</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.map((booking) => (
              <tr key={booking._id}>
                <td data-label='Student'>
                  <strong>{booking.user?.name || 'Student'}</strong>
                  <p className='muted-cell'>{booking.user?.email || '-'}</p>
                </td>
                <td data-label='Slot'>
                  <select
                    value={booking.slot}
                    onChange={async (event) => {
                      await changeGeneralAreaBookingSlot(booking._id, event.target.value);
                      await load();
                    }}
                  >
                    <option value='morning'>Morning</option>
                    <option value='evening'>Evening</option>
                    <option value='wholeDay'>Whole Day</option>
                  </select>
                </td>
                <td data-label='Phone'>{booking.user?.phone || '-'}</td>
                <td data-label='Subscription'>
                  {formatDate(booking.subscription?.startDate)} to{' '}
                  {formatDate(booking.subscription?.endDate)}
                </td>
                <td data-label='Actions'>
                  <button
                    type='button'
                    className='danger-button'
                    onClick={async () => {
                      await cancelGeneralAreaBooking(booking._id);
                      await load();
                    }}
                  >
                    Cancel
                  </button>
                </td>
              </tr>
            ))}
            {filteredBookings.length === 0 && (
              <tr>
                <td className='empty-cell' colSpan='5'>
                  No active general area bookings found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
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
