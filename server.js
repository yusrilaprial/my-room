const express = require("express");
const http = require("http");
const {Server} = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = 3000;

app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("join room", (roomId) => {
    socket.join(roomId);
    const users = [...(io.sockets.adapter.rooms.get(roomId) || [])];
    console.log(`User joined room: ${roomId}`);
    socket.emit("all users", users);
    socket.to(roomId).emit("user joined", socket.id);

    socket.on("offer", ({offer, to}) => {
      io.to(to).emit("offer", {offer, from: socket.id});
    });

    socket.on("answer", ({answer, to}) => {
      io.to(to).emit("answer", {answer, from: socket.id});
    });

    socket.on("ice candidate", ({iceCandidate, to}) => {
      io.to(to).emit("ice candidate", {iceCandidate, from: socket.id});
    });

    socket.on("disconnect", () => {
      socket.to(roomId).emit("user left", socket.id);
      console.log("A user disconnected");
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
