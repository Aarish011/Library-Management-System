import axios from './axiosConfig';

export const getActiveReservation = async () => {
  try {
    const response = await axios.get('/reservations/active');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch reservation' };
  }
};