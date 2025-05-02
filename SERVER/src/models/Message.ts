import mongoose from "mongoose"

const attachmentSchema = new mongoose.Schema({
  type: { type: String, enum: ["image", "audio", "file"], required: true },
  url: { type: String, required: true },
  fileName: String,
  fileSize: Number,
  mimeType: String,
  width: Number,
  height: Number,
  duration: Number, // for audio/video
})

const reactionSchema = new mongoose.Schema({
  emoji: { type: String, required: true },
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
})

const messageSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
      required: true,
    },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    attachments: [attachmentSchema],
    reactions: [reactionSchema],
    isEdited: { type: Boolean, default: false },
    editHistory: [
      {
        text: String,
        editedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
)

export const Message = mongoose.model("Message", messageSchema)
