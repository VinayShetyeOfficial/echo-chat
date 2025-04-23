import mongoose from "mongoose";

const invitationSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    email: String,
    channelId: { type: mongoose.Schema.Types.ObjectId, ref: "Channel" },
    expires: { type: Date, required: true },
    used: { type: Boolean, default: false },
    usedAt: Date,
    usedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const Invitation = mongoose.model("Invitation", invitationSchema);
