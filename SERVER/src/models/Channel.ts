import mongoose from "mongoose";

const channelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    type: {
      type: String,
      enum: ["direct", "group"],
      required: true,
    },
    isPrivate: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    members: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        role: { type: String, enum: ["admin", "member"], default: "member" },
        joinedAt: { type: Date, default: Date.now },
        lastReadMessage: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Message",
        },
      },
    ],
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    pinnedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    mutedBy: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        mutedUntil: Date,
      },
    ],
  },
  { timestamps: true }
);

export const Channel = mongoose.model("Channel", channelSchema);
