const Seat = require('../models/Seats');

const getSeatPrice = (seatNumber) => {
  if (seatNumber >= 1 && seatNumber <= 10) return 799; // A
  if (seatNumber >= 11 && seatNumber <= 20) return 799; // B
  if (seatNumber >= 21 && seatNumber <= 30) return 899; // C
  if (seatNumber >= 31 && seatNumber <= 40) return 999; // D
  if (seatNumber >= 41 && seatNumber <= 50) return 899; // E
  if (seatNumber >= 51 && seatNumber <= 60) return 999; // F
  if (seatNumber >= 61 && seatNumber <= 65) return 1099; // G
  return 849; // H (66-75)
};

const generateSeats = () => {
  const seats = [];

  for (let i = 1; i <= 75; i++) {
    let section = '';

    if (i >= 1 && i <= 10) section = 'A';
    else if (i >= 11 && i <= 20) section = 'B';
    else if (i >= 21 && i <= 30) section = 'C';
    else if (i >= 31 && i <= 40) section = 'D';
    else if (i >= 41 && i <= 50) section = 'E';
    else if (i >= 51 && i <= 60) section = 'F';
    else if (i >= 61 && i <= 65) section = 'G';
    else section = 'H';

    seats.push({
      seatNumber: i,
      section,
      zone: i >= 1 && i <= 10 ? 'girls' : 'general',
      status: 'available',
      assignedTo: null,
      price: getSeatPrice(i),
    });
  }

  return seats;
};

const seedSeats = async () => {
  try {
    await Seat.deleteMany({});

    const seats = generateSeats();

    await Seat.insertMany(seats);

    console.log('✅ 75 seats inserted successfully');
  } catch (error) {
    console.error(error);
  }
};

module.exports = seedSeats;
