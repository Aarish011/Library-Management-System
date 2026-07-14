import { useEffect, useState } from 'react';
import { getSeats, updateSeat } from '../api/seatApi';
import DataTable from '../components/common/DataTable';

export default function SeatsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [updatingSeatId, setUpdatingSeatId] = useState('');

  const loadSeats = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getSeats();
      setRows(response.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load seats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSeats();
  }, []);

  const toggleMaintenance = async (seat) => {
    const nextStatus = seat.status === 'maintenance' ? 'available' : 'maintenance';
    try {
      setUpdatingSeatId(seat._id);
      setError('');
      setMessage('');
      await updateSeat(seat._id, { status: nextStatus });
      setMessage(
        nextStatus === 'maintenance'
          ? `Seat ${seat.seatNumber} marked for maintenance`
          : `Seat ${seat.seatNumber} restored to available`
      );
      await loadSeats();
    } catch (err) {
      setError(err.message || 'Failed to update seat');
    } finally {
      setUpdatingSeatId('');
    }
  };

  return (
    <section className='page'>
      <div className='page-heading'>
        <div>
          <h1>Seats</h1>
          <p>Mark available seats for maintenance or restore them when ready.</p>
        </div>
        <button type='button' className='secondary-button' onClick={loadSeats}>
          Refresh
        </button>
      </div>

      {message && <p className='archive-success'>{message}</p>}
      {error && <p className='error'>{error}</p>}

      {loading ? (
        <p className='loader'>Loading seats...</p>
      ) : (
        <DataTable
          columns={[
            { key: 'seatNumber', label: 'Seat' },
            { key: 'zone', label: 'Zone' },
            {
              key: 'status',
              label: 'Status',
              render: (seat) => <SeatStatus status={seat.status} />,
            },
            {
              key: 'heldBy',
              label: 'Assigned To',
              render: (seat) => seat.heldBy?.name || '-',
            },
            {
              key: 'actions',
              label: 'Actions',
              render: (seat) => {
                const isBusy = updatingSeatId === seat._id;
                const isAssigned = seat.status === 'booked' || Boolean(seat.heldBy);
                const isMaintenance = seat.status === 'maintenance';

                return (
                  <button
                    type='button'
                    className={isMaintenance ? 'secondary-button' : 'danger-button'}
                    disabled={isBusy || (!isMaintenance && isAssigned)}
                    title={
                      !isMaintenance && isAssigned
                        ? 'Release this seat before marking it for maintenance'
                        : ''
                    }
                    onClick={() => toggleMaintenance(seat)}
                  >
                    {isBusy
                      ? 'Updating...'
                      : isMaintenance
                        ? 'Restore'
                        : 'Maintenance'}
                  </button>
                );
              },
            },
          ]}
          rows={rows}
        />
      )}
    </section>
  );
}

function SeatStatus({ status }) {
  const className =
    status === 'maintenance'
      ? 'status-pill status-maintenance'
      : status === 'available'
        ? 'status-pill status-available'
        : status === 'booked'
          ? 'status-pill status-booked'
          : 'status-pill status-held';

  return <span className={className}>{status}</span>;
}
