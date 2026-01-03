import { Request, Response } from "express";
import { sendError, sendSuccess } from "../utils/sendResponse";
import { Invoice } from "../models/Invoice.model";

const BN_MONTHS = [
  "জানুয়ারি",
  "ফেব্রুয়ারি",
  "মার্চ",
  "এপ্রিল",
  "মে",
  "জুন",
  "জুলাই",
  "আগস্ট",
  "সেপ্টেম্বর",
  "অক্টোবর",
  "নভেম্বর",
  "ডিসেম্বর",
];

export const getMonthlyRevenue = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 401, "Unauthorized");

    const year = Number(req.query.year) || new Date().getFullYear();
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));

    const result = await Invoice.aggregate([
      { $match: { userId: req.user.id } },

      // Parse issueDate (you store string like "YYYY-MM-DD" or ISO)
      {
        $addFields: {
          issueDateParsed: {
            $dateFromString: { dateString: "$issueDate" },
          },
        },
      },

      { $match: { issueDateParsed: { $gte: start, $lt: end } } },

      // Compute subtotal = sum(items.qty * items.rate)
      {
        $addFields: {
          subtotal: {
            $sum: {
              $map: {
                input: "$items",
                as: "it",
                in: {
                  $multiply: [
                    { $ifNull: ["$$it.qty", 0] },
                    { $ifNull: ["$$it.rate", 0] },
                  ],
                },
              },
            },
          },
        },
      },

      // taxAmount (percentage or fixed)
      {
        $addFields: {
          taxAmount: {
            $cond: [
              { $eq: ["$taxType", "fixed"] },
              { $ifNull: ["$tax", 0] },
              {
                $divide: [
                  { $multiply: ["$subtotal", { $ifNull: ["$tax", 0] }] },
                  100,
                ],
              },
            ],
          },
          discountSafe: { $ifNull: ["$discount", 0] },
          shippingSafe: { $ifNull: ["$shipping", 0] },
          paidSafe: { $ifNull: ["$paidAmount", 0] },
        },
      },

      // total = subtotal + tax + shipping - discount
      {
        $addFields: {
          total: {
            $max: [
              0,
              {
                $subtract: [
                  { $add: ["$subtotal", "$taxAmount", "$shippingSafe"] },
                  "$discountSafe",
                ],
              },
            ],
          },
        },
      },

      // collected = min(paidAmount, total)
      {
        $addFields: {
          collected: { $min: ["$paidSafe", "$total"] },
          month: { $month: "$issueDateParsed" }, // 1..12
        },
      },

      // Group by month
      {
        $group: {
          _id: "$month",
          revenue: { $sum: "$collected" },
        },
      },

      { $sort: { _id: 1 } },
    ]);

    // Fill missing months with 0
    const map = new Map<number, number>();
    for (const r of result) map.set(r._id, Math.round(r.revenue || 0));

    const data = BN_MONTHS.map((m, idx) => ({
      month: m,
      revenue: map.get(idx + 1) ?? 0,
    }));

    return sendSuccess(res, 200, "Monthly revenue", { year, data });
  } catch (error) {
    return sendError(res, 500, "Failed to fetch revenue", error);
  }
};

export const getInvoiceStatusBreakdown = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 401, "Unauthorized");

    const now = new Date();
    const year = Number(req.query.year) || now.getFullYear();
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));

    const rows = await Invoice.aggregate([
      { $match: { userId: req.user.id } },

      // Parse issueDate + dueDate (strings)
      {
        $addFields: {
          issueDateParsed: { $dateFromString: { dateString: "$issueDate" } },
          dueDateParsed: {
            $cond: [
              { $and: [{ $ne: ["$dueDate", null] }, { $ne: ["$dueDate", ""] }] },
              { $dateFromString: { dateString: "$dueDate" } },
              null,
            ],
          },
        },
      },

      { $match: { issueDateParsed: { $gte: start, $lt: end } } },

      // subtotal
      {
        $addFields: {
          subtotal: {
            $sum: {
              $map: {
                input: "$items",
                as: "it",
                in: {
                  $multiply: [
                    { $ifNull: ["$$it.qty", 0] },
                    { $ifNull: ["$$it.rate", 0] },
                  ],
                },
              },
            },
          },
        },
      },

      // tax/discount/shipping/paid
      {
        $addFields: {
          taxAmount: {
            $cond: [
              { $eq: ["$taxType", "fixed"] },
              { $ifNull: ["$tax", 0] },
              {
                $divide: [
                  { $multiply: ["$subtotal", { $ifNull: ["$tax", 0] }] },
                  100,
                ],
              },
            ],
          },
          discountSafe: { $ifNull: ["$discount", 0] },
          shippingSafe: { $ifNull: ["$shipping", 0] },
          paidSafe: { $ifNull: ["$paidAmount", 0] },
        },
      },

      // total
      {
        $addFields: {
          total: {
            $max: [
              0,
              {
                $subtract: [
                  { $add: ["$subtotal", "$taxAmount", "$shippingSafe"] },
                  "$discountSafe",
                ],
              },
            ],
          },
        },
      },

      // classify into Paid / Due / Expired
      {
        $addFields: {
          bucket: {
            $cond: [
              { $gte: ["$paidSafe", "$total"] },
              "Paid",
              {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$dueDateParsed", null] },
                      { $lt: ["$dueDateParsed", now] },
                    ],
                  },
                  "Expired",
                  "Due",
                ],
              },
            ],
          },
        },
      },

      { $group: { _id: "$bucket", value: { $sum: 1 } } },
      { $project: { _id: 0, name: "$_id", value: 1 } },
      { $sort: { name: 1 } },
    ]);

    // Ensure all buckets exist even if zero
    const map = new Map<string, number>(rows.map((r: any) => [r.name, r.value]));
    const data = [
      { name: "Paid", value: map.get("Paid") ?? 0 },
      { name: "Due", value: map.get("Due") ?? 0 },
      { name: "Expired", value: map.get("Expired") ?? 0 },
    ];

    return sendSuccess(res, 200, "Invoice status breakdown", { year, data });
  } catch (error) {
    return sendError(res, 500, "Failed to fetch invoice status", error);
  }
};

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    if (!req.user) return sendError(res, 401, "Unauthorized");

    // NOTE: This uses server time. If you want Dhaka exact boundaries on server,
    // set TZ=Asia/Dhaka in your server env or later we can compute with timezone library.
    const now = new Date();

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const rows = await Invoice.aggregate([
      { $match: { userId: req.user.id } },

      // Parse issueDate and dueDate from string
      {
        $addFields: {
          issueDateParsed: { $dateFromString: { dateString: "$issueDate" } },
          dueDateParsed: {
            $cond: [
              { $and: [{ $ne: ["$dueDate", null] }, { $ne: ["$dueDate", ""] }] },
              { $dateFromString: { dateString: "$dueDate" } },
              null,
            ],
          },
        },
      },

      // subtotal
      {
        $addFields: {
          subtotal: {
            $sum: {
              $map: {
                input: "$items",
                as: "it",
                in: {
                  $multiply: [
                    { $ifNull: ["$$it.qty", 0] },
                    { $ifNull: ["$$it.rate", 0] },
                  ],
                },
              },
            },
          },
        },
      },

      // tax / totals
      {
        $addFields: {
          taxAmount: {
            $cond: [
              { $eq: ["$taxType", "fixed"] },
              { $ifNull: ["$tax", 0] },
              {
                $divide: [
                  { $multiply: ["$subtotal", { $ifNull: ["$tax", 0] }] },
                  100,
                ],
              },
            ],
          },
          discountSafe: { $ifNull: ["$discount", 0] },
          shippingSafe: { $ifNull: ["$shipping", 0] },
          paidSafe: { $ifNull: ["$paidAmount", 0] },
        },
      },
      {
        $addFields: {
          total: {
            $max: [
              0,
              {
                $subtract: [
                  { $add: ["$subtotal", "$taxAmount", "$shippingSafe"] },
                  "$discountSafe",
                ],
              },
            ],
          },
        },
      },

      // collected = min(paid, total), outstanding = total - collected
      {
        $addFields: {
          collected: { $min: ["$paidSafe", "$total"] },
          outstanding: {
            $max: [0, { $subtract: ["$total", { $min: ["$paidSafe", "$total"] }] }],
          },
        },
      },

      {
        $facet: {
          todayIncome: [
            { $match: { issueDateParsed: { $gte: startOfToday, $lt: startOfTomorrow } } },
            { $group: { _id: null, value: { $sum: "$collected" } } },
          ],
          monthInvoices: [
            { $match: { issueDateParsed: { $gte: startOfMonth, $lt: startOfNextMonth } } },
            { $count: "value" },
          ],
          duePayment: [
            // Outstanding from all invoices (due + overdue)
            { $group: { _id: null, value: { $sum: "$outstanding" } } },
          ],
        },
      },
    ]);

    const doc = rows?.[0] || {};
    const todayIncome = Math.round(doc.todayIncome?.[0]?.value || 0);
    const monthInvoices = doc.monthInvoices?.[0]?.value || 0;
    const duePayment = Math.round(doc.duePayment?.[0]?.value || 0);

    return sendSuccess(res, 200, "Dashboard stats", {
      todayIncome,
      monthInvoices,
      duePayment,
    });
  } catch (error) {
    return sendError(res, 500, "Failed to fetch dashboard stats", error);
  }
};