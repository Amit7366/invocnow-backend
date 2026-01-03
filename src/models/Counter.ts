import { Schema, model, Document } from "mongoose";

export interface CounterDocument extends Document {
  userId: string;
  key: string; // e.g. "invoice"
  seq: number;
}

const CounterSchema = new Schema<CounterDocument>(
  {
    userId: { type: String, required: true, index: true },
    key: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// One counter per user+key
CounterSchema.index({ userId: 1, key: 1 }, { unique: true });

export const Counter = model<CounterDocument>("Counter", CounterSchema);
