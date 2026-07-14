import { useState } from 'react';
import {
  LOCKER_DEPOSIT,
  LOCKER_RENT,
  computePrice,
} from '../../utils/plansConfig';

export default function BookingSummary({
  seat,
  onCancel,
  onConfirm,
  isBooking,
  selectedPlan,
  selectedSlot,
  onSlotChange,
}) {
  const [lockerSelected, setLockerSelected] = useState(false);
  const totalAmount = computePrice(selectedPlan, lockerSelected, selectedSlot);
  const hasLockerRent = selectedPlan.plan === 'library_access';

  const startDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  if (!seat) {
    return (
      <div className='rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center'>
        <p className='text-[14px] text-slate-500'>
          Select an available seat to see booking details here.
        </p>
      </div>
    );
  }

  return (
    <div className='rounded-2xl border border-slate-200 bg-white shadow-sm p-5 sm:p-6'>
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-[15px] font-semibold text-slate-900'>
          Booking summary
        </h3>
        <span className='px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[12px] font-medium'>
          Seat {seat.seatNumber}
        </span>
      </div>

      <dl className='space-y-2.5 mb-5'>
        <Row label='Section' value={seat.section || seat.zone || 'Library'} />
        <Row
          label='Status'
          value='Selected'
          valueClass='text-emerald-600 font-medium'
        />
        <Row label='Start date' value={startDate} />
        {selectedPlan.plan === 'library_access' && (
          <Row
            label='Selected slot'
            value={formatSlot(selectedSlot) || 'Choose a slot'}
            valueClass={
              selectedSlot
                ? 'text-emerald-600 font-medium'
                : 'text-red-600 font-medium'
            }
          />
        )}
      </dl>

      {selectedPlan.plan === 'library_access' && (
        <div className='mb-5 rounded-xl border border-slate-200 p-3'>
          <p className='mb-2 text-[13px] font-semibold text-slate-900'>
            Seat slot
          </p>
          <div className='grid grid-cols-2 gap-2'>
            {['morning', 'evening'].map((slot) => {
              const status = seat.slotAvailability?.[slot] || 'available';
              const available = status === 'available';
              const active = selectedSlot === slot;
              return (
                <button
                  key={slot}
                  type='button'
                  disabled={!available || isBooking}
                  onClick={() => onSlotChange(slot)}
                  className={`rounded-lg border px-3 py-2 text-left text-[12.5px] transition ${
                    active
                      ? 'border-[#11182B] bg-[#11182B] text-white'
                      : available
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                        : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span className='block font-semibold'>{formatSlot(slot)}</span>
                  <span className='block text-[11px]'>
                    {available ? 'Available' : 'Booked'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className='mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4'>
        <p className='text-[13px] font-semibold text-amber-900'>
          {selectedPlan.name}
        </p>
        <p className='mt-1 text-[12.5px] text-amber-800'>
          {selectedPlan.plan === 'library_access'
            ? 'General seat package: choose one seat from 66 to 75.'
            : 'Reserved seat package: choose one seat from 1 to 65.'}
        </p>
      </div>

      <label className='mb-5 flex items-start gap-3 rounded-xl border border-slate-200 p-3 cursor-pointer hover:bg-slate-50'>
        <input
          type='checkbox'
          checked={lockerSelected}
          onChange={(event) => setLockerSelected(event.target.checked)}
          className='mt-1 h-4 w-4 accent-[#11182B]'
        />
        <span className='min-w-0'>
          <span className='block text-[13px] font-medium text-slate-900'>
            Add locker
          </span>
          <span className='block text-[12.5px] text-slate-500'>
            {hasLockerRent
              ? `Choose locker number on payment page. Rs. ${LOCKER_RENT.toLocaleString('en-IN')}/month rent + refundable Rs. ${LOCKER_DEPOSIT.toLocaleString('en-IN')} security.`
              : `Choose locker number on payment page. Refundable Rs. ${LOCKER_DEPOSIT.toLocaleString('en-IN')} security only. No monthly locker rent for reserved seats.`}
          </span>
        </span>
      </label>

      <div className='border-t border-slate-100 pt-4 mb-5 space-y-1.5'>
        <Row label='Monthly library fee' value={`Rs. ${selectedPlan.price.toLocaleString('en-IN')}`} />
        {hasLockerRent && (
          <Row label='Locker rent' value={lockerSelected ? `Rs. ${LOCKER_RENT.toLocaleString('en-IN')}` : 'Not selected'} />
        )}
        <Row label='Locker security' value={lockerSelected ? `Rs. ${LOCKER_DEPOSIT.toLocaleString('en-IN')}` : 'Not selected'} />
        <Row label='Plan duration' value={`${selectedPlan.duration} days`} />
        <div className='flex justify-between items-baseline pt-1'>
          <span className='text-[14px] font-medium text-slate-900'>
            Total amount
          </span>
          <span className='text-[20px] font-semibold text-slate-900'>
            Rs. {totalAmount.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      <div className='flex gap-3'>
        <button
          type='button'
          onClick={onCancel}
          disabled={isBooking}
          className='flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-[14px] font-medium hover:bg-slate-50 transition-colors disabled:opacity-50'
        >
          Cancel selection
        </button>
        <button
          type='button'
          onClick={() => onConfirm({ selectedPlan, lockerSelected, selectedSlot })}
          disabled={
            isBooking || (selectedPlan.plan === 'library_access' && !selectedSlot)
          }
          className='flex-1 py-2.5 rounded-lg bg-[#11182B] text-white text-[14px] font-medium hover:bg-[#1B2540] transition-colors disabled:opacity-60 flex items-center justify-center gap-2'
        >
          {isBooking ? (
            <>
              <Spinner /> Booking...
            </>
          ) : (
            'Confirm booking'
          )}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, valueClass = 'text-slate-900' }) {
  return (
    <div className='flex items-center justify-between gap-3'>
      <dt className='text-[13px] text-slate-500'>{label}</dt>
      <dd className={`text-[13.5px] font-medium text-right ${valueClass}`}>{value}</dd>
    </div>
  );
}

function formatSlot(slot) {
  if (slot === 'morning') return 'Morning (8:00 AM - 2:30 PM)';
  if (slot === 'evening') return 'Evening (3:00 PM - 8:30 PM)';
  return '';
}

function Spinner() {
  return (
    <svg className='animate-spin h-4 w-4' viewBox='0 0 24 24' fill='none'>
      <circle
        cx='12'
        cy='12'
        r='10'
        stroke='currentColor'
        strokeWidth='3'
        className='opacity-25'
      />
      <path
        d='M22 12a10 10 0 0 1-10 10'
        stroke='currentColor'
        strokeWidth='3'
        strokeLinecap='round'
      />
    </svg>
  );
}
