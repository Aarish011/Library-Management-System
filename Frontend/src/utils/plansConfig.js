// Frontend view of the subscription plans enforced by the backend.

export const LOCKER_DEPOSIT = 250;

export const PLANS = [
  {
    id: 'library_access',
    plan: 'library_access',
    name: 'Library Access',
    price: 1250,
    duration: 30,
    tagline: 'Monthly library access without reserved seat',
    highlight: false,
    reservesSeat: false,
    lockerDeposit: LOCKER_DEPOSIT,
    features: [
      'Full library access for 30 days',
      'Seat is not reserved with this package',
      'Same monthly fee for every student',
      'Optional refundable locker deposit',
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
    lockerDeposit: LOCKER_DEPOSIT,
    features: [
      'Full library access for 30 days',
      'Selected seat is reserved after payment',
      'Same fee for all seats',
      'Optional refundable locker deposit',
    ],
  },
];

export function getPlan(plan) {
  return PLANS.find((item) => item.plan === plan || item.id === plan) ?? null;
}

export function computePrice(plan, lockerSelected = false) {
  return (plan?.price ?? 0) + (lockerSelected ? LOCKER_DEPOSIT : 0);
}

export function formatPlanName(plan) {
  return getPlan(plan)?.name ?? 'No active plan';
}
