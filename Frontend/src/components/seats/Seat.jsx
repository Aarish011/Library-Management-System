// Seat.jsx
// A single seat in the map. Visual state is driven entirely by `status`
// plus the `isSelected` flag — no section colors here, since status must
// always read clearly (BookMyShow-style: green/red/yellow/gray, full stop).

export default function Seat({
  seat,
  isSelected,
  onSelect,
  femaleOnly = false,
  unavailableForPlan = false,
}) {
  const isGeneralSlotSeat = Boolean(seat.slotAvailability);
  const slotSummary = getSlotSummary(seat.slotAvailability);
  const isDisabled =
    (!isGeneralSlotSeat && seat.status === 'occupied') ||
    seat.status === 'maintenance' ||
    unavailableForPlan ||
    slotSummary.state === 'full';

  const base =
    'relative flex flex-col items-center justify-center rounded-lg text-[10px] sm:text-[11px] font-semibold ' +
    'w-11 h-11 sm:w-14 sm:h-14 transition-all duration-150 select-none border-2';

  const stateClasses = unavailableForPlan
    ? 'bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed opacity-60'
    : isSelected
    ? 'bg-amber-400 border-amber-500 text-amber-900 shadow-md shadow-amber-300/60 scale-110 animate-seat-pop'
    : isGeneralSlotSeat && slotSummary.state === 'both'
      ? 'bg-emerald-50 border-emerald-400 text-emerald-700 hover:bg-emerald-100 hover:scale-105 cursor-pointer'
    : isGeneralSlotSeat && slotSummary.state === 'morningBooked'
      ? 'bg-blue-50 border-blue-400 text-blue-700 hover:bg-blue-100 hover:scale-105 cursor-pointer'
    : isGeneralSlotSeat && slotSummary.state === 'eveningBooked'
      ? 'bg-orange-50 border-orange-400 text-orange-700 hover:bg-orange-100 hover:scale-105 cursor-pointer'
    : isGeneralSlotSeat && slotSummary.state === 'full'
      ? 'bg-red-50 border-red-300 text-red-500 cursor-not-allowed opacity-80'
    : seat.status === 'available' && femaleOnly
      ? 'bg-pink-100 border-pink-400 text-pink-700 hover:bg-pink-200 hover:scale-105 cursor-pointer'
      : seat.status === 'available'
      ? 'bg-emerald-50 border-emerald-400 text-emerald-700 hover:bg-emerald-100 hover:scale-105 cursor-pointer'
      : seat.status === 'occupied'
        ? 'bg-red-50 border-red-300 text-red-400 cursor-not-allowed opacity-80'
        : 'bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed opacity-80';

  return (
    <button
      type='button'
      disabled={isDisabled}
      onClick={() => onSelect(seat)}
      aria-label={`Seat ${seat.seatNumber}, ${
        unavailableForPlan
          ? 'not available for selected plan'
          : isSelected
            ? 'selected'
            : seat.status
      }`}
      aria-pressed={isSelected}
      title={
        unavailableForPlan
          ? `Seat ${seat.seatNumber} - not available for selected plan`
          : isGeneralSlotSeat
            ? `Seat ${seat.seatNumber} - Morning: ${slotSummary.morningText}, Evening: ${slotSummary.eveningText}`
            : `Seat ${seat.seatNumber} - ${seat.section} - ${seat.status}`
      }
      className={`${base} ${stateClasses}`}
    >
      <span>{seat.seatNumber}</span>
      {isGeneralSlotSeat && (
        <span className='mt-0.5 text-[8px] sm:text-[9px] font-medium leading-tight'>
          M:{slotSummary.morningShort} E:{slotSummary.eveningShort}
        </span>
      )}
      {seat.status === 'maintenance' && (
        <span className='absolute -top-1 -right-1 text-[8px]'>
          <svg viewBox='0 0 24 24' width='10' height='10' fill='currentColor'>
            <path d='M12 2L1 21h22L12 2zm0 5l7.5 13h-15L12 7zm-1 4v4h2v-4h-2zm0 5v2h2v-2h-2z' />
          </svg>
        </span>
      )}
    </button>
  );
}

function getSlotSummary(slotAvailability) {
  if (!slotAvailability) {
    return {
      state: 'none',
      morningText: '',
      eveningText: '',
      morningShort: '',
      eveningShort: '',
    };
  }

  const morningAvailable = slotAvailability.morning === 'available';
  const eveningAvailable = slotAvailability.evening === 'available';

  return {
    state:
      morningAvailable && eveningAvailable
        ? 'both'
        : !morningAvailable && eveningAvailable
          ? 'morningBooked'
          : morningAvailable && !eveningAvailable
            ? 'eveningBooked'
            : 'full',
    morningText: morningAvailable ? 'Available' : 'Booked',
    eveningText: eveningAvailable ? 'Available' : 'Booked',
    morningShort: morningAvailable ? 'A' : 'B',
    eveningShort: eveningAvailable ? 'A' : 'B',
  };
}
