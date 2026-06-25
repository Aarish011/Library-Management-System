import api from './axiosConfig';

function subscriptionError(error, fallback) {
  return error.response?.data || { message: fallback };
}

export async function getPlans() {
  try {
    const { data } = await api.get('/subscriptions/plans');
    return data;
  } catch (error) {
    throw subscriptionError(error, 'Failed to fetch subscription plans');
  }
}

export async function getActiveSubscription() {
  try {
    const { data } = await api.get('/subscriptions/active');
    return data;
  } catch (error) {
    throw subscriptionError(error, 'Failed to fetch active subscription');
  }
}

export async function fetchMySubscription() {
  const response = await getActiveSubscription();
  return response.data;
}

export async function createSubscription(payload) {
  try {
    const { data } = await api.post('/subscriptions', payload);
    return data;
  } catch (error) {
    throw subscriptionError(error, 'Failed to create subscription');
  }
}

export async function subscribeToPlan(payload) {
  const response = await createSubscription(payload);
  return response.data;
}

export async function renewSubscription(subscriptionId, payload = {}) {
  try {
    const { data } = await api.put(`/subscriptions/renew/${subscriptionId}`, payload);
    return data;
  } catch (error) {
    throw subscriptionError(error, 'Failed to renew subscription');
  }
}

export async function cancelSubscription(subscriptionId) {
  try {
    const { data } = await api.put(`/subscriptions/cancel/${subscriptionId}`);
    return data;
  } catch (error) {
    throw subscriptionError(error, 'Failed to cancel subscription');
  }
}