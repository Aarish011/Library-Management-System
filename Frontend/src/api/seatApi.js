import axios from './axiosConfig';

// Get all seats
export const getSeats = async () => {
  try {
    const response = await axios.get('/seats');
    return response.data;
  } catch (error) {
    console.error('Get seats error:', error);
    throw error.response?.data || { message: 'Failed to fetch seats' };
  }
};

// Get seat layout
export const getSeatLayout = async () => {
  try {
    const response = await axios.get('/seats/layout');
    return response.data;
  } catch (error) {
    console.error('Get seat layout error:', error);
    throw error.response?.data || { message: 'Failed to fetch seat layout' };
  }
};

// ✅ FIXED: Accept object with seatId and duration
export const reserveSeat = async ({ seatId, duration = 300, plan, slot }) => {
  try {
    console.log('📝 Reserving seat:', { seatId, duration });
    const response = await axios.post('/seats/reserve', {
      seatId,
      duration,
      plan,
      slot,
    });
    console.log('✅ Reserve response:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Reserve seat error:', error);
    console.error('Response:', error.response?.data);
    throw error.response?.data || { message: 'Failed to reserve seat' };
  }
};

// Cancel reservation
export const cancelReservation = async (reservationId) => {
  try {
    const response = await axios.delete(`/seats/cancel/${reservationId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to cancel reservation' };
  }
};

// Extend reservation
export const extendReservation = async (reservationId, extraTime = 120) => {
  try {
    const response = await axios.put(`/seats/extend/${reservationId}`, {
      extraTime,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to extend reservation' };
  }
};
