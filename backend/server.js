require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const roomsRouter = require("./src/routes/rooms");
const registerSocketHandlers = require("./src/socket/socketHandler");
const RoomManager = require("./src/managers/RoomManager");

const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim());

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});
app.use("/api/rooms", roomsRouter);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, methods: ["GET", "POST"] },
});

const roomManager = new RoomManager();

io.on("connection", (socket) => {
  registerSocketHandlers(io, socket, roomManager);
});

if (process.env.MONGO_URI) {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("MongoDB connection error:", err.message));
} else {
  console.log("MONGO_URI not set - running without persistence");
}

server.listen(PORT, () => {
  console.log(`Watch Party backend running on port ${PORT}`);
});