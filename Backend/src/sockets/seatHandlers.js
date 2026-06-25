module.exports = (socket, io) => {
  // Join seat room
  socket.on('join-seat-room', (seatId) => {
    socket.join(`seat-${seatId}`);
    console.log(`Client joined seat-${seatId}`);
  });

  // Leave seat room
  socket.on('leave-seat-room', (seatId) => {
    socket.leave(`seat-${seatId}`);
    console.log(`Client left seat-${seatId}`);
  });

  // Emit seat update
  socket.on('seat:update', (data) => {
    io.to(`seat-${data.seatId}`).emit('seat:updated', data);
  });
};
