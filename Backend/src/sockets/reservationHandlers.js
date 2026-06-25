module.exports = (socket, io) => {
  // Join reservation room
  socket.on('join-reservation-room', (reservationId) => {
    socket.join(`reservation-${reservationId}`);
    console.log(`Client joined reservation-${reservationId}`);
  });

  // Timer events
  socket.on('reservation:timer', (data) => {
    io.to(`reservation-${data.reservationId}`).emit('reservation:time-update', {
      timeLeft: data.timeLeft,
    });
  });
};
