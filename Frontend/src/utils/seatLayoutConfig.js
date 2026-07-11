// seatLayoutConfig.js
// Single source of truth for the library's physical layout — mirrors the
// uploaded "LIBRARY MAP" image exactly: 6 double-rows of 10 seats (1–60),
// a short 5-seat row near the gate (61–65), and a two-column table section
// near the entrance (66–75).

export const SECTIONS = [
  {
    id: 'A',
    name: 'Female Only Seats',
    range: [1, 10],
    color: '#EC4899',
    price: 1500,
    femaleOnly: true,
  },
  { id: 'B', name: 'Reserved Seats', range: [11, 20], color: '#11182B', price: 1500 },
  { id: 'C', name: 'Reserved Seats', range: [21, 30], color: '#11182B', price: 1500 },
  { id: 'D', name: 'Reserved Seats', range: [31, 40], color: '#11182B', price: 1500 },
  { id: 'E', name: 'Reserved Seats', range: [41, 50], color: '#11182B', price: 1500 },
  { id: 'F', name: 'Reserved Seats', range: [51, 60], color: '#11182B', price: 1500 },
  {
    id: 'G',
    name: 'Reserved Seats',
    range: [61, 65],
    color: '#11182B',
    price: 1500,
  },
  { id: 'H', name: 'General Seats', range: [66, 75], color: '#0E7A5F', price: 1000 },
];

// Visual blocks — each mirrors one "table" of seats in the image.
// Rows are listed exactly in the left-to-right order shown on the map
// (note some rows count down, e.g. 15,14,13,12,11 — that's intentional).
export const SEAT_BLOCKS = [
  {
    sectionId: 'A',
    rows: [
      [1, 2, 3, 4, 5],
      [6, 7, 8, 9, 10],
    ],
  },
  {
    sectionId: 'B',
    rows: [
      [15, 14, 13, 12, 11],
      [16, 17, 18, 19, 20],
    ],
  },
  {
    sectionId: 'C',
    rows: [
      [25, 24, 23, 22, 21],
      [26, 27, 28, 29, 30],
    ],
  },
  {
    sectionId: 'D',
    rows: [
      [35, 34, 33, 32, 31],
      [36, 37, 38, 39, 40],
    ],
  },
  {
    sectionId: 'E',
    rows: [
      [45, 44, 43, 42, 41],
      [46, 47, 48, 49, 50],
    ],
  },
  {
    sectionId: 'F',
    rows: [
      [55, 54, 53, 52, 51],
      [56, 57, 58, 59, 60],
    ],
  },
];

// The short row right above the gate: 64,63,62,61 across the top,
// with seat 65 sitting alone underneath seat 61.
export const ENTRANCE_ROW = {
  sectionId: 'G',
  top: [64, 63, 62, 61],
  below: 65,
};

// The two-column "study table" section past the gate.
export const SIDE_BLOCK = {
  sectionId: 'H',
  left: [66, 67, 68, 69, 70],
  right: [71, 72, 73, 74, 75],
};

export const TOTAL_SEATS = 75;

export function getSectionForSeat(seatNumber) {
  return SECTIONS.find(
    (s) => seatNumber >= s.range[0] && seatNumber <= s.range[1]
  );
}

export function getPriceForSeat(seatNumber) {
  return getSectionForSeat(seatNumber)?.price ?? 799;
}

// Deterministic demo data so the page renders meaningfully without a live
// backend. Replace entirely with the GET /api/seats response in production.
const OCCUPIED_SEATS = new Set([
  3, 8, 14, 19, 23, 29, 34, 38, 44, 49, 53, 58, 63, 68, 72,
]);
const MAINTENANCE_SEATS = new Set([6, 17, 27, 37, 47, 57]);

export function buildMockSeats() {
  const seats = [];
  for (let n = 1; n <= TOTAL_SEATS; n++) {
    const section = getSectionForSeat(n);
    let status = 'available';
    if (OCCUPIED_SEATS.has(n)) status = 'occupied';
    if (MAINTENANCE_SEATS.has(n)) status = 'maintenance';
    seats.push({
      _id: `seat_${n}`,
      seatNumber: n,
      status,
      section: section?.name ?? 'Unassigned',
      assignedTo: status === 'occupied' ? 'Reserved' : null,
    });
  }
  return seats;
}
