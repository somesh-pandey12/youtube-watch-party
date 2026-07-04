const ROLES = {
  HOST: "host",
  MODERATOR: "moderator",
  PARTICIPANT: "participant",
};

const CAN_CONTROL_PLAYBACK = new Set([ROLES.HOST, ROLES.MODERATOR]);

function isHost(role) {
  return role === ROLES.HOST;
}

function canControlPlayback(role) {
  return CAN_CONTROL_PLAYBACK.has(role);
}

module.exports = { ROLES, isHost, canControlPlayback };