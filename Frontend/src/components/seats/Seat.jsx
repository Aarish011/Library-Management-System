// Seat.jsx
// A single seat in the map. Visual state is driven entirely by `status`
// plus the `isSelected` flag — no section colors here, since status must
// always read clearly (BookMyShow-style: green/red/yellow/gray, full stop).

export default function Seat({ seat, isSelected, onSelect }) {
  const isDisabled =
    seat.status === 'occupied' || seat.status === 'maintenance';

  const base =
    'relative flex items-center justify-center rounded-lg text-[10px] sm:text-[11px] font-semibold ' +
    'w-8 h-8 sm:w-9 sm:h-9 transition-all duration-150 select-none border-2';

  const stateClasses = isSelected
    ? 'bg-amber-400 border-amber-500 text-amber-900 shadow-md shadow-amber-300/60 scale-110 animate-seat-pop'
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
      aria-label={`Seat ${seat.seatNumber}, ${isSelected ? 'selected' : seat.status}`}
      aria-pressed={isSelected}
      title={`Seat ${seat.seatNumber} · ${seat.section} · ${seat.status}`}
      className={`${base} ${stateClasses}`}
    >
      {seat.seatNumber}
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
