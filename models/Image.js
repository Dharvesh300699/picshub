const mongoose = require("mongoose");

const ImageSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
    trim: true,
  },
  path: {
    type: String,
    required: true,
  },
  caption: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    default: "public",
    enum: ["public", "private"],
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    require: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  uuid1: {
    type: String,
    required: true,
  },
  uuid2: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("Image", ImageSchema);
