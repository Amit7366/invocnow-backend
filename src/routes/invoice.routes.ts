import { Router } from "express";
import {
  createInvoice,
  getInvoices,
  getInvoiceById
//   getInvoices,
//   getInvoiceById,
//   updateInvoice,
} from "../controllers/invoice.controller";
import { requireGoogleAuth } from "../middlewares/auth.middleware";

const router = Router();

router.post("/",requireGoogleAuth ,createInvoice);
router.get("/", requireGoogleAuth, getInvoices);
router.get("/:id", requireGoogleAuth, getInvoiceById); // ✅ view page
// router.get("/:id", getInvoiceById);
// router.put("/:id", updateInvoice);

export default router;
