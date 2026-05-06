// backend/server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/execute', require('./routes/execute'));

// Socket.io
io.on('connection', (socket) => {
  socket.on('join-review', (reviewId) => {
    socket.join(reviewId);
    console.log(`User joined room: ${reviewId}`);
  });

  socket.on('add-comment', ({ reviewId, comment }) => {
    io.to(reviewId).emit('new-comment', comment);
  });

  socket.on('update-status', ({ reviewId, status }) => {
    io.to(reviewId).emit('status-changed', status);
  });

  socket.on('update-code', ({ reviewId, modifiedCode }) => {
    io.to(reviewId).emit('code-updated', modifiedCode);
  });

  socket.on('chat-message', ({ reviewId, message }) => {
    socket.to(reviewId).emit('chat-message', message);
  });

  socket.on('disconnect', () => console.log('User disconnected'));
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error(err));