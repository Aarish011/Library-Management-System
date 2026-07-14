import { apiRequest } from './client';

export function getGeneralAreaOverview() {
  return apiRequest('/general-area/admin/overview');
}

export function updateGeneralAreaSettings(payload) {
  return apiRequest('/general-area/admin/settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function cancelGeneralAreaBooking(bookingId) {
  return apiRequest(`/general-area/admin/bookings/${bookingId}/cancel`, {
    method: 'PUT',
  });
}

export function changeGeneralAreaBookingSlot(bookingId, slot) {
  return apiRequest(`/general-area/admin/bookings/${bookingId}/slot`, {
    method: 'PUT',
    body: JSON.stringify({ slot }),
  });
}
