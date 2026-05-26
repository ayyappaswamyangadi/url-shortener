import mongoose, { Document, Schema } from "mongoose";

export interface IUrl extends Document {
  originalUrl: string;
  shortId: string;
  clicks: number;
  createdAt: Date;
  expiredAt?: Date;
}

const UrlSchema: Schema<IUrl> = new Schema({
  originalUrl: {
    type: String,
    required: true,
  },
  shortId: {
    type: String,
    required: true,
    unique: true,
  },
  clicks: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now, // ✅ fixed: Date.now (not Date.now()) so each doc gets its own timestamp
  },
  expiredAt: {
    type: Date,
  },
});

export default mongoose.model<IUrl>("Url", UrlSchema);
