const { ROLES } = require("../constants/roles");

class Room {
  constructor(roomId) {
    this.roomId = roomId;
    this.participants = new Map();
    this.videoId = null;
    this.playState = "paused";
    this.currentTime = 0;
    this.hostSocketId = null;
    this.createdAt = Date.now();
  }

  isEmpty() {
    return this.participants.size === 0;
  }

  addParticipant(participant) {
    if (!this.hostSocketId) {
      participant.role = ROLES.HOST;
      this.hostSocketId = participant.socketId;
    }
    this.participants.set(participant.socketId, participant);
    return participant;
  }

  removeParticipant(socketId) {
    const wasHost = this.hostSocketId === socketId;
    this.participants.delete(socketId);

    if (wasHost && this.participants.size > 0) {
      const next = [...this.participants.values()].sort(
        (a, b) => a.joinedAt - b.joinedAt
      )[0];
      next.role = ROLES.HOST;
      this.hostSocketId = next.socketId;
      return next;
    }
    if (this.participants.size === 0) {
      this.hostSocketId = null;
    }
    return null;
  }

  getParticipant(socketId) {
    return this.participants.get(socketId);
  }

  getParticipantByUserId(userId) {
    return [...this.participants.values()].find((p) => p.userId === userId);
  }

  getParticipantsList() {
    return [...this.participants.values()].map((p) => p.toJSON());
  }

  assignRole(targetSocketId, role) {
    const target = this.participants.get(targetSocketId);
    if (!target) return null;
    target.role = role;
    return target;
  }

  transferHost(targetSocketId) {
    const target = this.participants.get(targetSocketId);
    if (!target) return null;
    const currentHost = this.participants.get(this.hostSocketId);
    if (currentHost) currentHost.role = ROLES.PARTICIPANT;
    target.role = ROLES.HOST;
    this.hostSocketId = target.socketId;
    return target;
  }

  updateState({ videoId, playState, currentTime }) {
    if (videoId !== undefined) this.videoId = videoId;
    if (playState !== undefined) this.playState = playState;
    if (currentTime !== undefined) this.currentTime = currentTime;
  }

  getState() {
    return {
      videoId: this.videoId,
      playState: this.playState,
      currentTime: this.currentTime,
    };
  }
}

module.exports = Room;