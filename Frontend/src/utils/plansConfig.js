// Frontend view of the subscription plans enforced by the backend.

export const LOCKER_DEPOSIT = 250;
export const LOCKER_RENT = 100;
export const GENERAL_SLOT_PRICES = {
  morning: 1000,
  evening: 1000,
  wholeDay: 1200,
};

export const PLANS = [
  {
    id: 'library_access',
    plan: 'library_access',
    name: 'Library Access',
    price: 1000,
    slotPrices: GENERAL_SLOT_PRICES,
    duration: 30,
    tagline: 'Monthly general area access by time slot',
    highlight: false,
    reservesSeat: false,
    allowedSeatRange: [66, 75],
    lockerDeposit: LOCKER_DEPOSIT,
    lockerRent: LOCKER_RENT,
    slots: ['morning', 'evening', 'wholeDay'],
    features: [
      'Full library access for 30 days',
      'Choose morning, evening, or whole-day general area slot',
      'General area seats are not individually assigned',
      'Monthly fee is per selected slot',
      'Optional locker rent and refundable security deposit',
    ],
  },
  {
    id: 'reserved_seat',
    plan: 'reserved_seat',
    name: 'Library Access + Reserved Seat',
    price: 1500,
    duration: 30,
    tagline: 'Monthly library access with your selected seat reserved',
    highlight: true,
    reservesSeat: true,
    allowedSeatRange: [1, 65],
    lockerDeposit: LOCKER_DEPOSIT,
    lockerRent: 0,
    slots: ['full_day'],
    features: [
      'Full library access for 30 days',
      'Selected seat is reserved after payment',
      'Choose one reserved seat from 1 to 65',
      'Optional locker with refundable security deposit',
    ],
  },
];

export function getPlan(plan) {
  return PLANS.find((item) => item.plan === plan || item.id === plan) ?? null;
}

export function getSeatFee(plan, slot = null) {
  if (plan?.plan === 'library_access') {
    return plan.slotPrices?.[slot] || plan.price || 0;
  }
  return plan?.price ?? 0;
}

export function computePrice(plan, lockerSelected = false, slot = null) {
  return (
    getSeatFee(plan, slot) +
    (lockerSelected ? (plan?.lockerRent ?? LOCKER_RENT) + LOCKER_DEPOSIT : 0)
  );
}

export function formatPlanName(plan) {
  return getPlan(plan)?.name ?? 'No active plan';
}
