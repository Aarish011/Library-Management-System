import { useEffect, useState } from 'react';
import { getSeatLayout, reserveSeat as reserveSeatApi } from '../api/seatApi';
import toast from 'react-hot-toast';

const useSeats = () => {
  const [seats, setSeats] = useState([]);
  const [layout, setLayout] = useState({});
  const [stats, setStats] = useState({});
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSeats = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📝 Fetching seats from API...');
      const response = await getSeatLayout();
      console.log('✅ Seats response:', response);

      if (response.success) {
        const allSeats = [];
        const layoutData = response.data.layout;

        Object.keys(layoutData).forEach((row) => {
          layoutData[row].forEach((seat) => {
            // Map backend status to frontend-friendly format
            let status = 'available';
            if (seat.status === 'held') status = 'reserved';
            else if (seat.status === 'booked') status = 'occupied';
            else status = 'available';

            allSeats.push({
              ...seat,
              status: status,
              originalStatus: seat.status,
              // ✅ Ensure _id is preserved
              _id: seat._id,
            });
          });
        });

        setSeats(allSeats);
        setLayout(layoutData);
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('❌ Failed to load seats:', error);
      setError(error.message || 'Failed to load seats');
      toast.error('Failed to load seat layout');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeats();
  }, []);

  const handleSeatSelect = (seat) => {
    if (seat.status === 'occupied' || seat.status === 'reserved') {
      toast.error(`Seat ${seat.seatNumber} is ${seat.status}`);
      return;
    }
    setSelectedSeat(seat);
    toast.success(`Seat ${seat.seatNumber} selected`);
  };

  const handleBookSeat = async () => {
    if (!selectedSeat) {
      toast.error('Please select a seat first');
      return;
    }

    try {
      setLoading(true);

      console.log('📝 Booking seat:', selectedSeat);

      // ✅ Send ONLY the MongoDB _id
      const response = await reserveSeatApi({
        seatId: selectedSeat._id,
        duration: 300,
      });

      if (response.success) {
        toast.success(`Seat ${selectedSeat.seatNumber} reserved successfully!`);
        await fetchSeats();
        setSelectedSeat(null);
        return response.data;
      }
    } catch (error) {
      console.error('❌ Failed to book seat:', error);
      toast.error(error.message || 'Failed to book seat');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    seats,
    layout,
    stats,
    selectedSeat,
    loading,
    error,
    handleSeatSelect,
    handleBookSeat,
    refreshSeats: fetchSeats,
  };
};

export default useSeats;
