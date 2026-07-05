const { nanoid } = require("nanoid");
const mongoose = require("mongoose");
const Participant = require("../models/Participant");
const { ROLES, isHost, canControlPlayback } = require("../constants/roles");

function registerSocketHandlers(io, socket, roomManager) {
  let currentRoomId = null;
  let currentUserId = null;

  socket.on("join_room", ({ roomId, username }) => {
    if (!roomId || !username) {
      socket.emit("error_message", { message: "roomId and username are required" });
      return;
    }

    const room = roomManager.getOrCreateRoom(roomId);
    const userId = nanoid(10);

    const participant = new Participant({
      userId,
      socketId: socket.id,
      username,
    });
    room.addParticipant(participant);

    socket.join(roomId);
    currentRoomId = roomId;
    currentUserId = userId;

    socket.emit("joined", {
      userId,
      role: participant.role,
      state: room.getState(),
      participants: room.getParticipantsList(),
    });

    socket.to(roomId).emit("user_joined", {
      username: participant.username,
      userId: participant.userId,
      role: participant.role,
      participants: room.getParticipantsList(),
    });

    if (mongoose.connection.readyState === 1) {
      const RoomMeta = require("../models/RoomMeta");
      RoomMeta.findOneAndUpdate(
        { roomId },
        { roomId, lastActiveAt: new Date() },
        { upsert: true }
      ).catch((err) => console.error("RoomMeta update failed:", err.message));
    }
  });

  socket.on("leave_room", () => {
    handleLeave();
  });

  socket.on("disconnect", () => {
    handleLeave();
  });

  function handleLeave() {
    if (!currentRoomId) return;
    const room = roomManager.getRoom(currentRoomId);
    if (!room) return;

    const leaving = room.getParticipant(socket.id);
    const promoted = room.removeParticipant(socket.id);

    socket.to(currentRoomId).emit("user_left", {
      username: leaving ? leaving.username : undefined,
      userId: leaving ? leaving.userId : undefined,
      participants: room.getParticipantsList(),
    });

    if (promoted) {
      io.to(currentRoomId).emit("role_assigned", {
        userId: promoted.userId,
        username: promoted.username,
        role: promoted.role,
        participants: room.getParticipantsList(),
      });
    }

    roomManager.deleteRoomIfEmpty(currentRoomId);
    currentRoomId = null;
    currentUserId = null;
  }

  socket.on("play", ({ currentTime } = {}) => {
    withPlaybackPermission((room) => {
      room.updateState({ playState: "playing", currentTime });
      io.to(currentRoomId).emit("sync_state", room.getState());
    });
  });

  socket.on("pause", ({ currentTime } = {}) => {
    withPlaybackPermission((room) => {
      room.updateState({ playState: "paused", currentTime });
      io.to(currentRoomId).emit("sync_state", room.getState());
    });
  });

  socket.on("seek", ({ time }) => {
    withPlaybackPermission((room) => {
      room.updateState({ currentTime: time });
      io.to(currentRoomId).emit("sync_state", room.getState());
    });
  });

  socket.on("change_video", ({ videoId }) => {
    withPlaybackPermission((room) => {
      room.updateState({ videoId, playState: "paused", currentTime: 0 });
      io.to(currentRoomId).emit("sync_state", room.getState());
    });
  });

  socket.on("assign_role", ({ userId, role }) => {
    withHostPermission((room) => {
      if (![ROLES.MODERATOR, ROLES.PARTICIPANT].includes(role)) return;
      const target = room.getParticipantByUserId(userId);
      if (!target) return;
      room.assignRole(target.socketId, role);
      io.to(currentRoomId).emit("role_assigned", {
        userId: target.userId,
        username: target.username,
        role: target.role,
        participants: room.getParticipantsList(),
      });
    });
  });

  socket.on("remove_participant", ({ userId }) => {
    withHostPermission((room) => {
      const target = room.getParticipantByUserId(userId);
      if (!target) return;
      room.removeParticipant(target.socketId);

      io.to(target.socketId).emit("kicked");
      const targetSocket = io.sockets.sockets.get(target.socketId);
      if (targetSocket) targetSocket.leave(currentRoomId);

      io.to(currentRoomId).emit("participant_removed", {
        userId: target.userId,
        participants: room.getParticipantsList(),
      });
    });
  });

  socket.on("transfer_host", ({ userId }) => {
    withHostPermission((room) => {
      const target = room.getParticipantByUserId(userId);
      if (!target) return;
      const oldHost = room.getParticipant(socket.id);
      room.transferHost(target.socketId);
      io.to(currentRoomId).emit("role_assigned", {
        userId: target.userId,
        username: target.username,
        role: ROLES.HOST,
        participants: room.getParticipantsList(),
      });
      if (oldHost) {
        io.to(currentRoomId).emit("role_assigned", {
          userId: oldHost.userId,
          username: oldHost.username,
          role: ROLES.PARTICIPANT,
          participants: room.getParticipantsList(),
        });
      }
    });
  });

  socket.on("chat_message", ({ text }) => {
    if (!currentRoomId || !text || !text.trim()) return;
    const room = roomManager.getRoom(currentRoomId);
    const sender = room && room.getParticipant(socket.id);
    io.to(currentRoomId).emit("chat_message", {
      username: sender ? sender.username : "Unknown",
      text: text.trim(),
      at: Date.now(),
    });
  });

  function withPlaybackPermission(fn) {
    const room = requireRoom();
    if (!room) return;
    const participant = room.getParticipant(socket.id);
    if (!participant || !canControlPlayback(participant.role)) {
      socket.emit("error_message", {
        message: "You don't have permission to control playback.",
      });
      return;
    }
    fn(room);
  }

  function withHostPermission(fn) {
    const room = requireRoom();
    if (!room) return;
    const participant = room.getParticipant(socket.id);
    if (!participant || !isHost(participant.role)) {
      socket.emit("error_message", { message: "Host permission required." });
      return;
    }
    fn(room);
  }

  function requireRoom() {
    if (!currentRoomId) return null;
    return roomManager.getRoom(currentRoomId) || null;
  }
}

module.exports = registerSocketHandlers;