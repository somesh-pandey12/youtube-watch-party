const { ROLES } = require("../constants/roles");

class Participant {
  constructor({ userId, socketId, username, role = ROLES.PARTICIPANT }) {
    this.userId = userId;
    this.socketId = socketId;
    this.username = username;
    this.role = role;
    this.joinedAt = Date.now();
  }

  toJSON() {
    return {
      userId: this.userId,
      username: this.username,
      role: this.role,
    };
  }
}

module.exports = Participant;