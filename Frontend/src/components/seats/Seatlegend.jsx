// SeatLegend.jsx

const LEGEND_ITEMS = [
  { label: 'Both slots available', classes: 'bg-emerald-50 border-emerald-400' },
  { label: 'Morning booked, evening available', classes: 'bg-blue-50 border-blue-400' },
  { label: 'Evening booked, morning available', classes: 'bg-orange-50 border-orange-400' },
  { label: 'Fully booked', classes: 'bg-red-50 border-red-300' },
  { label: 'Selected', classes: 'bg-amber-400 border-amber-500' },
  { label: 'Maintenance', classes: 'bg-slate-100 border-slate-300' },
];

export default function SeatLegend() {
  return (
    <div className='flex flex-wrap items-center gap-x-5 gap-y-2'>
      {LEGEND_ITEMS.map((item) => (
        <div key={item.label} className='flex items-center gap-2'>
          <span
            className={`w-4 h-4 rounded-md border-2 ${item.classes}`}
            aria-hidden='true'
          />
          <span className='text-[13px] text-slate-600'>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
