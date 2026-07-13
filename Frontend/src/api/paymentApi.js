import axios from './axiosConfig';

export const getAvailableLockers = async () => {
  try {
    const response = await axios.get('/payments/lockers/available');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch lockers' };
  }
};

export const createRazorpayOrder = async (payload) => {
  try {
    const response = await axios.post('/payments/razorpay/create-order', payload);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to create payment order' };
  }
};

export const verifyRazorpayPayment = async (payload) => {
  try {
    const response = await axios.post('/payments/razorpay/verify', payload);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to verify payment' };
  }
};


export const createDeskReference = async (payload) => {
  try {
    const response = await axios.post('/payments/desk/create-reference', payload);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to create desk payment reference' };
  }
};
export const getPaymentHistory = async () => {
  try {
    const response = await axios.get('/payments/history');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch payment history' };
  }
};

export const getPaymentStatus = async (paymentId) => {
  try {
    const response = await axios.get(`/payments/status/${paymentId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch payment status' };
  }
};
