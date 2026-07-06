/**
 * WebSocket broadcast service
 * Manages connected clients and broadcasts messages.
 */
const clients = new Set();

function addClient(socket) {
  clients.add(socket);
}

function removeClient(socket) {
  clients.delete(socket);
}

function broadcast(data) {
  const message = JSON.stringify(data);
  for (const client of clients) {
    try {
      client.send(message);
    } catch (e) {
      clients.delete(client);
    }
  }
}

module.exports = { addClient, removeClient, broadcast };
