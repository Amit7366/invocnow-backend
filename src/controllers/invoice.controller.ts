import { Request, Response } from "express";
import { Invoice } from "../models/Invoice.model";
import { sendSuccess, sendError } from "../utils/sendResponse";
import { getNextInvoiceNo } from "../lib/getNextInvoiceNo";

export const createInvoice = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 401, "Unauthorized");
    }

    const userId = req.user.id;

    // ✅ generate invoiceNo on server (don’t trust client)
    const invoiceNo = await getNextInvoiceNo(userId);

    const invoice = await Invoice.create({
      ...req.body,
      userId,
      userName: req.user.name || "",
      userEmail: req.user.email || "",
      invoiceNo,
      status: "draft",
    });

    return sendSuccess(res, 201, "Invoice created successfully", invoice);
  } catch (error: any) {
    // Optional: handle duplicate key nicely (should be rare with counter)
    if (error?.code === 11000) {
      return sendError(res, 409, "Duplicate invoice number", error);
    }
    return sendError(res, 500, "Failed to create invoice", error);
  }
};

// invoices.controller.ts
export const getInvoices = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 401, "Unauthorized");

    const invoices = await Invoice.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    return sendSuccess(res, 200, "Invoices fetched successfully", invoices);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch invoices", error);
  }
};


export const getInvoiceById = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 401, "Unauthorized");

    const { id } = req.params;

    const invoice = await Invoice.findOne({ _id: id, userId: req.user.id }).lean();
    if (!invoice) return sendError(res, 404, "Invoice not found");

    return sendSuccess(res, 200, "Invoice fetched successfully", invoice);
  } catch (error) {
    return sendError(res, 500, "Failed to fetch invoice", error);
  }
};
