import { useState } from 'react';
import { LOCKER_DEPOSIT, computePrice, getPlan } from '../../utils/plansConfig';

const RESERVED_SEAT_PLAN = getPlan('reserved_seat');

export default function BookingSummary({
  seat,
  onCancel,
  onConfirm,
  isBooking,
}) {
  const [lockerSelected, setLockerSelected] = useState(false);
  const totalAmount = computePrice(RESERVED_SEAT_PLAN, lockerSelected);

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
      </dl>

      <div className='mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4'>
        <p className='text-[13px] font-semibold text-amber-900'>
          {RESERVED_SEAT_PLAN.name}
        </p>
        <p className='mt-1 text-[12.5px] text-amber-800'>
          The Rs. 1500 package reserves your selected seat after payment.
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
            Add locker deposit
          </span>
          <span className='block text-[12.5px] text-slate-500'>
            Optional refundable locker fee: Rs. {LOCKER_DEPOSIT.toLocaleString('en-IN')}.
          </span>
        </span>
      </label>

      <div className='border-t border-slate-100 pt-4 mb-5 space-y-1.5'>
        <Row label='Library + reserved seat' value={`Rs. ${RESERVED_SEAT_PLAN.price.toLocaleString('en-IN')}`} />
        <Row label='Locker deposit' value={lockerSelected ? `Rs. ${LOCKER_DEPOSIT.toLocaleString('en-IN')}` : 'Not selected'} />
        <Row label='Plan duration' value={`${RESERVED_SEAT_PLAN.duration} days`} />
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
          onClick={() => onConfirm({ selectedPlan: RESERVED_SEAT_PLAN, lockerSelected })}
          disabled={isBooking}
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
