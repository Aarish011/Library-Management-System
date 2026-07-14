import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getGeneralAreaAvailability } from '../../api/generalAreaApi';

const statusLabel = {
  available: 'Available',
  'almost-full': 'Almost Full',
  full: 'Full',
  'temporarily-closed': 'Temporarily Closed',
};

const statusClass = {
  available: 'bg-emerald-100 text-emerald-700',
  'almost-full': 'bg-amber-100 text-amber-800',
  full: 'bg-red-100 text-red-700',
  'temporarily-closed': 'bg-slate-100 text-slate-600',
};

export default function GeneralSlotAvailability({ selectedPlan, onChoose }) {
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAvailability = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getGeneralAreaAvailability();
      setAvailability(response.data);
    } catch (err) {
      setError(err.message || 'Failed to load general area availability');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAvailability();
  }, []);

  if (loading) {
    return (
      <div className='mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5'>
        <p className='text-sm text-slate-500'>Loading general area slots...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className='mt-7 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700'>
        {error}
        <button
          type='button'
          onClick={loadAvailability}
          className='ml-3 font-semibold underline'
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className='mt-7 rounded-2xl border border-slate-200 bg-white p-5'>
      <div className='mb-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2'>
        <div>
          <h2 className='text-[17px] font-semibold text-slate-900'>
            General Area Slot Availability
          </h2>
          <p className='mt-1 text-sm text-slate-500'>
            General-area seats are not individually assigned. Choose a time slot below.
          </p>
        </div>
        {!availability?.bookingEnabled && (
          <span className='rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600'>
            Booking closed
          </span>
        )}
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        {(availability?.slots || []).map((slot) => {
          const fee = selectedPlan?.slotPrices?.[slot.slot] || selectedPlan?.price || 0;
          const disabled =
            !availability.bookingEnabled ||
            !slot.isOpen ||
            slot.remaining <= 0 ||
            slot.status === 'full' ||
            slot.status === 'temporarily-closed';

          return (
            <div
              key={slot.slot}
              className='rounded-xl border border-slate-200 p-4 shadow-sm'
            >
              <div className='flex items-start justify-between gap-3'>
                <div>
                  <p className='text-base font-semibold text-slate-900'>
                    {slot.label} Slot
                  </p>
                  <p className='mt-1 text-sm text-slate-500'>
                    {slot.remaining} slots available
                  </p>
                  <p className='mt-1 text-sm font-semibold text-slate-900'>
                    Rs. {fee.toLocaleString('en-IN')}/month
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    statusClass[slot.status] || statusClass.available
                  }`}
                >
                  {statusLabel[slot.status] || 'Available'}
                </span>
              </div>

              <dl className='mt-4 space-y-1.5 text-sm'>
                <Row label='Capacity' value={slot.capacity} />
                <Row label='Monthly fee' value={`Rs. ${fee.toLocaleString('en-IN')}`} />
                <Row label='Active bookings' value={slot.booked} />
                <Row label='Remaining' value={slot.remaining} />
              </dl>

              <button
                type='button'
                disabled={disabled}
                onClick={() => {
                  if (disabled) {
                    toast.error('This slot is not available right now');
                    return;
                  }
                  onChoose(slot.slot);
                }}
                className='mt-4 w-full rounded-lg bg-[#11182B] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1B2540] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500'
              >
                Choose {slot.label}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className='flex items-center justify-between gap-3'>
      <dt className='text-slate-500'>{label}</dt>
      <dd className='font-semibold text-slate-900'>{value}</dd>
    </div>
  );
}
