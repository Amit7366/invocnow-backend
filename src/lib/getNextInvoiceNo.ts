import { Counter } from "../models/Counter";

export async function getNextInvoiceNo(userId: string) {
  // Atomic increment (safe even with many clicks / many tabs)
  const doc = await Counter.findOneAndUpdate(
    { userId, key: "invoice" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const n = doc.seq;
  return `INV-${String(n).padStart(3, "0")}`; // INV-001, INV-002...
}
