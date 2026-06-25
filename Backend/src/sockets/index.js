const jwt = require('jsonwebtoken');

function getToken(socket) {
  return socket.handshake.auth?.token || socket.handshake.query?.token || null;
}

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    const token = getToken(socket);
    if (token && process.env.JWT_SECRET) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded?.id) {
          socket.userId = decoded.id;
          socket.join(`user:${decoded.id}`);
        }
      } catch (error) {
        console.warn(`Socket auth failed for ${socket.id}: ${error.message}`);
      }
    }

    require('./seatHandlers')(socket, io);
    require('./reservationHandlers')(socket, io);

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
};
