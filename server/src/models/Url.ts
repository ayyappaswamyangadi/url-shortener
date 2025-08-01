import mongoose, { Document, Schema } from "mongoose";

export interface IUrl extends Document {
  originalUrl: string;
  shortId: string;
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
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  expiredAt: {
    type: Date,
  },
});

export default mongoose.model<IUrl>("Url", UrlSchema);
