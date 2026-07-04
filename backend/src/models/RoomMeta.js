const mongoose = require("mongoose");

const RoomMetaSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  hostUsername: { type: String },
  createdAt: { type: Date, default: Date.now },
  lastActiveAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("RoomMeta", RoomMetaSchema);