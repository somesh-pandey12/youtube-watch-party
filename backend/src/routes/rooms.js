const express = require("express");
const { nanoid } = require("nanoid");
const mongoose = require("mongoose");

const router = express.Router();

router.post("/create", async (req, res) => {
  const roomId = nanoid(8);

  if (mongoose.connection.readyState === 1) {
    try {
      const RoomMeta = require("../models/RoomMeta");
      await RoomMeta.create({
        roomId,
        hostUsername: req.body?.username || "Host",
      });
    } catch (err) {
      console.error("RoomMeta save failed:", err.message);
    }
  }

  res.json({ roomId });
});

module.exports = router;