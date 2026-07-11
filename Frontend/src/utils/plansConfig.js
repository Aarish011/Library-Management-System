// Frontend view of the subscription plans enforced by the backend.

export const LOCKER_DEPOSIT = 250;
export const LOCKER_RENT = 100;

export const PLANS = [
  {
    id: 'library_access',
    plan: 'library_access',
    name: 'Library Access',
    price: 1000,
    duration: 30,
    tagline: 'Monthly library access with a seat from 66 to 75',
    highlight: false,
    reservesSeat: true,
    allowedSeatRange: [66, 75],
    lockerDeposit: LOCKER_DEPOSIT,
    lockerRent: LOCKER_RENT,
    slots: ['morning', 'evening'],
    features: [
      'Full library access for 30 days',
      'Choose morning or evening slot from seats 66 to 75',
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

export function computePrice(plan, lockerSelected = false) {
  return (
    (plan?.price ?? 0) +
    (lockerSelected ? (plan?.lockerRent ?? LOCKER_RENT) + LOCKER_DEPOSIT : 0)
  );
}

export function formatPlanName(plan) {
  return getPlan(plan)?.name ?? 'No active plan';
}
