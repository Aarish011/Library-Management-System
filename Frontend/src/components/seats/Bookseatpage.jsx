import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Seat from '../../components/seats/Seat';
import SeatLegend from '../../components/seats/Seatlegend';
import BookingSummary from '../../components/seats/Bookingsummary';
import GeneralSlotAvailability from '../../components/seats/GeneralSlotAvailability';
import { getSeatLayout, reserveSeat } from '../../api/seatApi';
import {
  SEAT_BLOCKS,
  ENTRANCE_ROW,
  SIDE_BLOCK,
  SECTIONS,
} from '../../utils/seatLayoutConfig';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { PLANS, getPlan } from '../../utils/plansConfig';
import useActionCooldown from '../../hooks/useActionCooldown';

export default function BookSeatPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { user } = useAuth();
  const bookingCooldown = useActionCooldown(8000);
  const [selectedPlan, setSelectedPlan] = useState(
    () => state?.selectedPlan || getPlan('reserved_seat')
  );
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [selectedSeatId, setSelectedSeatId] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isBooking, setIsBooking] = useState(false);
  const isMounted = useRef(true);

  // ---------- FETCH SEATS ----------
  const fetchSeats = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);

      console.log('ðŸ“ Fetching seats from API...');
      const response = await getSeatLayout();
      console.log('âœ… Full API Response:', JSON.stringify(response, null, 2));

      if (!response?.success) {
        throw new Error(response?.message || 'Failed to fetch seats');
      }

      // ðŸ” Check different possible data structures
      let layoutData = null;
      let seatsArray = [];

      // Case 1: response.data.layout (expected)
      if (response.data?.layout) {
        layoutData = response.data.layout;
        console.log('ðŸ“Š Layout Data:', layoutData);

        // Flatten the layout into an array of seats
        Object.keys(layoutData).forEach((row) => {
          if (Array.isArray(layoutData[row])) {
            layoutData[row].forEach((seat) => {
              if (seat) {
                let status = 'available';
                if (seat.status === 'held') status = 'reserved';
                else if (seat.status === 'booked') status = 'occupied';
                else status = 'available';

                seatsArray.push({
                  ...seat,
                  status: status,
                  _id: seat._id || seat.id,
                });
              }
            });
          }
        });
      }
      // Case 2: response.data is directly an array
      else if (Array.isArray(response.data)) {
        seatsArray = response.data.map((seat) => ({
          ...seat,
          status:
            seat.status === 'held'
              ? 'reserved'
              : seat.status === 'booked'
                ? 'occupied'
                : 'available',
          _id: seat._id || seat.id,
        }));
      }
      // Case 3: response.data.seats
      else if (Array.isArray(response.data?.seats)) {
        seatsArray = response.data.seats.map((seat) => ({
          ...seat,
          status:
            seat.status === 'held'
              ? 'reserved'
              : seat.status === 'booked'
                ? 'occupied'
                : 'available',
          _id: seat._id || seat.id,
        }));
      }
      // Case 4: No seats found - create fallback mock data
      else {
        console.warn('âš ï¸ No seats found in response, using fallback mock data');
        seatsArray = createFallbackSeats();
      }

      console.log('âœ… Processed Seats:', seatsArray);
      console.log('âœ… Seat Count:', seatsArray.length);

      if (isMounted.current) {
        setSeats(seatsArray);
        if (seatsArray.length === 0) {
          setLoadError(
            'No seats available in the system. Please contact the administrator.'
          );
        }
      }
    } catch (err) {
      console.error('âŒ Fetch seats error:', err);
      if (isMounted.current) {
        // Create fallback seats on error
        const fallbackSeats = createFallbackSeats();
        setSeats(fallbackSeats);
        setLoadError(
          err.message || 'Failed to load seats from server. Using demo data.'
        );
        toast.error('Using demo seat data');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  // Create fallback seats for demo/development
  const createFallbackSeats = useCallback(() => {
    const seats = [];
    const rows = ['A', 'B', 'C', 'D'];
    const columns = 6;
    const zoneMap = { A: 'girls', B: 'girls', C: 'general', D: 'general' };

    rows.forEach((row, rowIndex) => {
      for (let col = 1; col <= columns; col++) {
        const seatNumber = `${row}${col}`;
        const isOccupied = Math.random() > 0.8;
        const isReserved = !isOccupied && Math.random() > 0.85;

        seats.push({
          _id: `seat_${row}${col}`,
          seatNumber: seatNumber,
          zone: zoneMap[row] || 'general',
          status: isOccupied
            ? 'occupied'
            : isReserved
              ? 'reserved'
              : 'available',
          row: rowIndex + 1,
          column: col,
          section: row,
        });
      }
    });

    return seats;
  }, []);

  // Load seats on mount - ONLY ONCE
  useEffect(() => {
    isMounted.current = true;
    fetchSeats();

    return () => {
      isMounted.current = false;
    };
  }, []); // Empty dependency array - only runs once

  // ---------- SEAT MAP ----------
  const seatMap = useMemo(() => {
    const map = new Map();
    seats.forEach((seat) => {
      if (seat?.seatNumber) {
        const seatNumber = Number(seat.seatNumber);
        const [minimumSeat, maximumSeat] =
          selectedPlan.allowedSeatRange || [1, 75];
        map.set(String(seat.seatNumber), {
          ...seat,
          unavailableForPlan:
            selectedPlan.plan === 'library_access' ||
            seatNumber < minimumSeat ||
            seatNumber > maximumSeat,
          generalVisualOnly:
            selectedPlan.plan === 'library_access' &&
            seatNumber >= minimumSeat &&
            seatNumber <= maximumSeat,
        });
      }
    });
    console.log('ðŸ—ºï¸ Seat Map size:', map.size);
    console.log('ðŸ—ºï¸ Seat Map keys:', Array.from(map.keys()));
    return map;
  }, [seats, selectedPlan]);

  // ---------- STATS ----------
  const stats = useMemo(() => {
    return {
      total: seats.length,
      occupied: seats.filter((s) => s.status === 'occupied').length,
      reserved: seats.filter((s) => s.status === 'reserved').length,
      available: seats.filter((s) => s.status === 'available').length,
    };
  }, [seats]);

  // ---------- SELECTED SEAT ----------
  const selectedSeat = useMemo(() => {
    return seats.find((s) => s._id === selectedSeatId) || null;
  }, [seats, selectedSeatId]);

  const handlePlanChange = useCallback((plan) => {
    setSelectedPlan(plan);
    setSelectedSeatId(null);
    setSelectedSlot(null);
  }, []);

  // ---------- SELECT SEAT ----------
  const handleSelectSeat = useCallback((seat) => {
    if (!seat) return;

    const seatNumber = Number(seat.seatNumber);
    if (selectedPlan.plan === 'library_access') {
      if (seatNumber >= 66 && seatNumber <= 75) {
        toast('General-area seats are not individually assigned. Choose a time slot below.');
        return;
      }
    }

    if (seat.unavailableForPlan) {
      toast.error(
        selectedPlan.plan === 'library_access'
        ? 'General-area seats are not individually assigned. Choose a time slot below.'
          : 'The Rs. 1500 plan allows seats 1 to 65 only'
      );
      return;
    }

    if (seatNumber >= 1 && seatNumber <= 10 && user?.gender !== 'female') {
      toast.error('Seats 1 to 10 are reserved for female students only');
      return;
    }

    if (seat.status === 'occupied') {
      toast.error(`Seat ${seat.seatNumber} is occupied`);
      return;
    }

    if (seat.status === 'reserved') {
      toast.error(`Seat ${seat.seatNumber} is reserved`);
      return;
    }

    setSelectedSeatId((prev) => {
      const nextSeatId = prev === seat._id ? null : seat._id;
      if (!nextSeatId) {
        setSelectedSlot(null);
        return nextSeatId;
      }

      if (selectedPlan.plan === 'library_access') {
        const availability = seat.slotAvailability || {};
        setSelectedSlot(
          availability.morning === 'available'
            ? 'morning'
            : availability.evening === 'available'
              ? 'evening'
              : null
        );
      } else {
        setSelectedSlot('full_day');
      }

      return nextSeatId;
    });
  }, [selectedPlan.plan, user?.gender]);

  // ---------- BOOK SEAT ----------
  const handleConfirmBooking = useCallback(async (booking = {}) => {
    if (
      !bookingCooldown.guard((seconds) =>
        toast.error(`Please wait ${seconds}s before trying again`)
      )
    ) {
      return;
    }

    if (selectedPlan.plan === 'library_access') {
      toast.error('Choose a general area time slot below');
      return;
    }

    if (!selectedSeat) {
      toast.error('Select a seat first');
      return;
    }

    const bookingSlot =
      booking.selectedSlot ||
      (selectedPlan.plan === 'library_access' ? selectedSlot : 'full_day');

    if (selectedPlan.plan === 'library_access' && !bookingSlot) {
      toast.error('Select morning or evening slot first');
      return;
    }

    try {
      setIsBooking(true);
      bookingCooldown.startCooldown();

      const response = await reserveSeat({
        seatId: selectedSeat._id,
        duration: 300,
        plan: booking.selectedPlan?.plan || selectedPlan.plan,
        slot: bookingSlot,
      });

      if (!response?.success)
        throw new Error(response?.message || 'Booking failed');

      toast.success(`Seat ${selectedSeat.seatNumber} reserved. Complete payment to confirm.`);

      await fetchSeats();
      setSelectedSeatId(null);
      navigate('/payments', {
        state: {
          selectedPlan: booking.selectedPlan,
          lockerSelected: booking.lockerSelected || false,
          selectedSlot: bookingSlot,
          reservation: response.data?.reservation,
          seat: response.data?.seat || selectedSeat,
          reservedUntil: response.data?.reservedUntil,
          timeLeft: response.data?.timeLeft,
        },
      });    } catch (err) {
      console.error('Booking error:', err);
      const message = err.message || 'Booking failed';

      if (message.toLowerCase().includes('already have a seat reservation')) {
        toast.success('You already have a reserved seat. Complete payment to confirm it.');
        navigate('/payments', { state: { selectedPlan: booking.selectedPlan, lockerSelected: booking.lockerSelected || false } });
        return;
      }

      toast.error(message);
    } finally {
      setIsBooking(false);
    }
  }, [selectedSeat, selectedPlan, selectedSlot, fetchSeats, navigate, bookingCooldown]);

  // Show loading state
  if (loading) {
    return (
      <div className='min-h-screen bg-slate-50 flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto'></div>
          <p className='mt-4 text-gray-500'>Loading seats...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className='min-h-screen bg-slate-50'
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <link
        href='https://fonts.googleapis.com/css2?family=Fraunces:wght@600&family=Inter:wght@400;500;600&display=swap'
        rel='stylesheet'
      />

      <Header stats={stats} selectedSeat={selectedSeat} />

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8'>
        {loadError && (
          <div className='mb-5 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[13px]'>
            {loadError}
            <button
              onClick={fetchSeats}
              className='ml-3 text-blue-600 hover:underline font-medium'
            >
              Retry
            </button>
          </div>
        )}

        {/* Seat Legend */}
        <div className='bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
          <SeatLegend />
          {seats.length > 0 && (
            <span className='text-sm text-gray-500'>
              {seats.length} seats available
            </span>
          )}
        </div>

        <div className='mb-6 border border-slate-200 bg-white px-4 py-4 sm:px-5'>
          <PackageSelector
            selectedPlan={selectedPlan}
            onChange={handlePlanChange}
          />

          <div className='grid gap-4 sm:grid-cols-3 sm:divide-x sm:divide-slate-200'>
            <PackageGuideItem
              title='General Seats'
              detail='Seats 66 to 75 | Morning or evening'
              price='Rs. 1,000/slot/month'
              color='bg-emerald-600'
            />
            <PackageGuideItem
              title='Reserved Seats'
              detail='Seats 1 to 65'
              price='Rs. 1,500/month'
              color='bg-[#11182B]'
            />
            <PackageGuideItem
              title='Optional Locker'
              detail='General: rent + security'
              price='Reserved: security only'
              color='bg-amber-500'
            />
          </div>
          <p className='mt-3 border-t border-slate-100 pt-3 text-[12.5px] font-medium text-slate-600'>
            Selected package: {selectedPlan.name}. Only seats included in this package can be selected.
          </p>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6'>
          <section className='bg-white rounded-2xl border border-slate-200 p-4 sm:p-8 overflow-x-auto'>
            {seats.length === 0 ? (
              <div className='text-center py-12'>
                <p className='text-gray-500 mb-4'>No seats available</p>
                <button
                  onClick={fetchSeats}
                  className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
                >
                  Refresh Seats
                </button>
              </div>
            ) : (
              <LibraryMap
                seatMap={seatMap}
                selectedSeatId={selectedSeatId}
                onSelectSeat={handleSelectSeat}
              />
            )}
            {selectedPlan.plan === 'library_access' && (
              <GeneralSlotAvailability
                selectedPlan={selectedPlan}
                onChoose={(slot) => {
                  setSelectedSlot(slot);
                  navigate('/payments', {
                    state: {
                      selectedPlan,
                      selectedSlot: slot,
                    },
                  });
                }}
              />
            )}
          </section>

          {/* Desktop summary */}
          <aside className='hidden lg:block'>
            <div className='sticky top-6'>
              <BookingSummary
                seat={selectedSeat}
                selectedPlan={selectedPlan}
                selectedSlot={selectedSlot}
                onSlotChange={setSelectedSlot}
                onCancel={() => {
                  setSelectedSeatId(null);
                  setSelectedSlot(null);
                }}
                onConfirm={handleConfirmBooking}
                isBooking={isBooking || bookingCooldown.isCoolingDown}
              />
            </div>
          </aside>
        </div>

        {/* Mobile/tablet summary */}
        <div className='lg:hidden mt-6'>
          <BookingSummary
            seat={selectedSeat}
            selectedPlan={selectedPlan}
            selectedSlot={selectedSlot}
            onSlotChange={setSelectedSlot}
            onCancel={() => {
              setSelectedSeatId(null);
              setSelectedSlot(null);
            }}
            onConfirm={handleConfirmBooking}
            isBooking={isBooking || bookingCooldown.isCoolingDown}
          />
        </div>
      </main>
    </div>
  );
}

// ================= HEADER =================
function Header({ stats, selectedSeat }) {
  return (
    <header className='bg-white border-b border-slate-200'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
        <h1
          className='text-[24px] sm:text-[26px] text-slate-900'
          style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}
        >
          Book your study seat
        </h1>
        <p className='text-[14px] text-slate-500 mt-1'>
          Choose your preferred seat and reserve it.
        </p>

        <div className='flex flex-wrap gap-4 sm:gap-6 mt-4'>
          <Stat label='Total seats' value={stats.total} />
          <Stat
            label='Available'
            value={stats.available}
            valueClass='text-emerald-600'
          />
          <Stat
            label='Reserved'
            value={stats.reserved}
            valueClass='text-amber-500'
          />
          <Stat
            label='Occupied'
            value={stats.occupied}
            valueClass='text-red-500'
          />
          <Stat
            label='Selected'
            value={selectedSeat ? `Seat ${selectedSeat.seatNumber}` : 'None'}
            valueClass='text-blue-600'
          />
        </div>
      </div>
    </header>
  );
}

function Stat({ label, value, valueClass = 'text-slate-900' }) {
  return (
    <div>
      <p className='text-[12px] text-slate-500'>{label}</p>
      <p className={`text-[16px] font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}

function PackageGuideItem({ title, detail, price, color }) {
  return (
    <div className='flex items-start gap-3 sm:px-4 first:pl-0'>
      <span className={`mt-1 h-3 w-3 shrink-0 rounded-sm ${color}`} />
      <div>
        <p className='text-[13px] font-semibold text-slate-900'>{title}</p>
        <p className='text-[12px] text-slate-500'>{detail}</p>
        <p className='mt-0.5 text-[13px] font-semibold text-slate-700'>{price}</p>
      </div>
    </div>
  );
}

function PackageSelector({ selectedPlan, onChange }) {
  return (
    <div className='mb-4 border-b border-slate-100 pb-4'>
      <p className='mb-2 text-[12px] font-semibold text-slate-600'>
        Choose seat type
      </p>
      <div
        className='grid grid-cols-2 rounded-lg bg-slate-100 p-1'
        role='group'
        aria-label='Choose seat package'
      >
        {PLANS.map((plan) => {
          const isSelected = selectedPlan.plan === plan.plan;
          return (
            <button
              key={plan.id}
              type='button'
              onClick={() => onChange(plan)}
              aria-pressed={isSelected}
              className={`min-h-12 px-3 py-2 text-[13px] font-semibold transition-colors ${
                isSelected
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className='block'>
                {plan.plan === 'library_access'
                  ? 'General Seats'
                  : 'Reserved Seats'}
              </span>
              <span className='block text-[11px] font-medium'>
                {plan.allowedSeatRange[0]}-{plan.allowedSeatRange[1]} | Rs.{' '}
                {plan.price.toLocaleString('en-IN')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ================= LIBRARY MAP =================
function LibraryMap({ seatMap, selectedSeatId, onSelectSeat }) {
  console.log('ðŸ” LibraryMap - seatMap size:', seatMap.size);
  console.log('ðŸ” LibraryMap - seatMap keys:', Array.from(seatMap.keys()));

  if (seatMap.size === 0) {
    return (
      <div className='text-center py-8 text-gray-500'>No seats to display</div>
    );
  }

  return (
    <div className='min-w-[640px] mx-auto space-y-7'>
      {SEAT_BLOCKS.map((block, idx) => (
        <SectionBlock
          key={idx}
          block={block}
          seatMap={seatMap}
          selectedSeatId={selectedSeatId}
          onSelectSeat={onSelectSeat}
        />
      ))}

      <EntranceRow
        seatMap={seatMap}
        selectedSeatId={selectedSeatId}
        onSelectSeat={onSelectSeat}
      />

      <GateBanner />

      <SideBlock
        seatMap={seatMap}
        selectedSeatId={selectedSeatId}
        onSelectSeat={onSelectSeat}
      />
    </div>
  );
}

// ================= SECTION LABEL =================
function SectionLabel({ sectionId }) {
  const section = SECTIONS.find((s) => s.id === sectionId);
  return (
    <div className='flex items-center gap-2 mb-2.5'>
      <span
        className='w-2.5 h-2.5 rounded-full'
        style={{ backgroundColor: section?.color }}
      />
      <span className='text-[12px] font-medium text-slate-500'>
        {section?.name}: {section?.range[0]} to {section?.range[1]}
      </span>
    </div>
  );
}

// ================= SECTION BLOCK =================
function SectionBlock({ block, seatMap, selectedSeatId, onSelectSeat }) {
  const [top, bottom] = block.rows;
  return (
    <div>
      <SectionLabel sectionId={block.sectionId} />
      <div className='grid grid-cols-5 gap-3 sm:gap-4'>
        {top.map((n) => (
          <SeatCell
            key={n}
            n={n}
            seatMap={seatMap}
            selectedSeatId={selectedSeatId}
            onSelectSeat={onSelectSeat}
          />
        ))}
      </div>
      <div className='h-[3px] bg-[#8a5a2b]/25 rounded my-2.5' />
      <div className='grid grid-cols-5 gap-3 sm:gap-4'>
        {bottom.map((n) => (
          <SeatCell
            key={n}
            n={n}
            seatMap={seatMap}
            selectedSeatId={selectedSeatId}
            onSelectSeat={onSelectSeat}
          />
        ))}
      </div>
    </div>
  );
}

// ================= ENTRANCE ROW =================
function EntranceRow({ seatMap, selectedSeatId, onSelectSeat }) {
  return (
    <div>
      <SectionLabel sectionId={ENTRANCE_ROW.sectionId} />
      <div className='grid grid-cols-4 gap-3 sm:gap-4'>
        {ENTRANCE_ROW.top.map((n) => (
          <SeatCell
            key={n}
            n={n}
            seatMap={seatMap}
            selectedSeatId={selectedSeatId}
            onSelectSeat={onSelectSeat}
          />
        ))}
      </div>
      <div className='h-[3px] bg-[#8a5a2b]/25 rounded my-2.5 w-3/4' />
      <div className='grid grid-cols-4 gap-3 sm:gap-4'>
        <div />
        <div />
        <div />
        <SeatCell
          n={ENTRANCE_ROW.below}
          seatMap={seatMap}
          selectedSeatId={selectedSeatId}
          onSelectSeat={onSelectSeat}
        />
      </div>
    </div>
  );
}

// ================= GATE BANNER =================
function GateBanner() {
  return (
    <div className='flex items-center gap-3 py-2'>
      <div className='px-5 py-2.5 rounded-lg bg-[#11182B] text-white text-[13px] font-semibold tracking-wide'>
        LIBRARY GATE
      </div>
      <svg
        width='48'
        height='12'
        viewBox='0 0 48 12'
        fill='none'
        className='text-amber-400'
      >
        <path
          d='M0 6h44M38 1l6 5-6 5'
          stroke='currentColor'
          strokeWidth='1.6'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
      <span className='text-[12px] text-slate-400'>Entrance</span>
    </div>
  );
}

// ================= SIDE BLOCK =================
function SideBlock({ seatMap, selectedSeatId, onSelectSeat }) {
  return (
    <div>
      <SectionLabel sectionId={SIDE_BLOCK.sectionId} />
      <div className='flex justify-center gap-8 sm:gap-14'>
        <div className='flex flex-col gap-3'>
          {SIDE_BLOCK.left.map((n) => (
            <SeatCell
              key={n}
              n={n}
              seatMap={seatMap}
              selectedSeatId={selectedSeatId}
              onSelectSeat={onSelectSeat}
            />
          ))}
        </div>
        <div className='w-[3px] bg-[#8a5a2b]/25 rounded' />
        <div className='flex flex-col gap-3'>
          {SIDE_BLOCK.right.map((n) => (
            <SeatCell
              key={n}
              n={n}
              seatMap={seatMap}
              selectedSeatId={selectedSeatId}
              onSelectSeat={onSelectSeat}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ================= SEAT CELL =================
function SeatCell({ n, seatMap, selectedSeatId, onSelectSeat }) {
  const seat = seatMap.get(String(n));

  if (!seat) {
    console.warn(`âš ï¸ Seat ${n} not found in map`);
    return <div className='w-8 h-8 sm:w-9 sm:h-9' />;
  }

  return (
    <div className='flex justify-center'>
      <Seat
        seat={seat}
        isSelected={seat._id === selectedSeatId}
        onSelect={onSelectSeat}
        femaleOnly={n >= 1 && n <= 10}
        unavailableForPlan={seat.unavailableForPlan}
      />
    </div>
  );
}


