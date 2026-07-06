const config = require('../config');
const { addClient, removeClient } = require('../services/broadcast');

module.exports = async function (fastify) {
  fastify.get('/ws', { websocket: true }, (socket, request) => {
    // Authenticate WebSocket connection via query token
    const token = request.query.token;
    if (!token || token !== config.accessToken) {
      socket.close(4001, 'Unauthorized');
      return;
    }

    addClient(socket);
    console.log('🔌 WebSocket client connected');

    socket.on('close', () => {
      removeClient(socket);
      console.log('🔌 WebSocket client disconnected');
    });

    socket.on('error', (err) => {
      console.error('WebSocket error:', err.message);
      removeClient(socket);
    });
  });
};
