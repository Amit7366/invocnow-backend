import { Schema, model, Document } from "mongoose";

/* =======================
   LINE ITEM
======================= */
const LineItemSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    qty: { type: Number, required: true },
    rate: { type: Number, required: true },
  },
  { _id: false }
);

/* =======================
   PARTY (FROM / TO)
======================= */
const PartySchema = new Schema(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
    logo: { type: String }, // base64 or URL
  },
  { _id: false }
);

/* =======================
   INVOICE DOCUMENT
======================= */
export interface InvoiceDocument extends Document {
  userId: string;
  userName: string,  // ✅ add
  userEmail: string, // ✅ optional add
  invoiceNo: string;
  issueDate: string;
  dueDate: string;

  from: typeof PartySchema;
  to: typeof PartySchema;

  items: typeof LineItemSchema[];

  taxType: "percentage" | "fixed";
  tax: number;
  discount: number;
  shipping: number;
  paidAmount: number;

  notes: string;
  terms: string;
  currency: string;

  theme: "classic" | "modern" | "compact";
  color: string;

  status: "draft" | "sent" | "paid";

  createdAt: Date;
  updatedAt: Date;
}

/* =======================
   MAIN SCHEMA
======================= */
const InvoiceSchema = new Schema<InvoiceDocument>(
  {
    userId: { type: String, required: true, index: true },
    userName: { type: String, default: "" },  // ✅ add
    userEmail: { type: String, default: "" }, // ✅ optional add
    invoiceNo: { type: String, required: true }, // remove unique: true


    issueDate: { type: String, required: true },
    dueDate: { type: String, required: true },

    from: { type: PartySchema, required: true },
    to: { type: PartySchema, required: true },

    items: { type: [LineItemSchema], required: true },

    taxType: {
      type: String,
      enum: ["percentage", "fixed"],
      default: "percentage",
    },

    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },

    notes: { type: String, default: "" },
    terms: { type: String, default: "" },

    currency: { type: String, default: "USD" },

    theme: {
      type: String,
      enum: ["classic", "modern", "compact", "stripe", "zoho", "freshbook"],
      default: "classic",
    },

    color: { type: String, default: "#000000" },

    status: {
      type: String,
      enum: ["draft", "sent", "paid"],
      default: "draft",
    },
  },
  { timestamps: true }
);

InvoiceSchema.index({ userId: 1, invoiceNo: 1 }, { unique: true });



export const Invoice = model<InvoiceDocument>("Invoice", InvoiceSchema);
