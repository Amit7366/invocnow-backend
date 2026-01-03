import { Router } from "express";
import { requireGoogleAuth } from "../middlewares/auth.middleware";
import { getDashboardStats, getInvoiceStatusBreakdown, getMonthlyRevenue } from "../controllers/analytics.controller";


const router = Router();

router.get("/revenue", requireGoogleAuth, getMonthlyRevenue);
router.get("/invoice-status", requireGoogleAuth, getInvoiceStatusBreakdown);
router.get("/dashboard", requireGoogleAuth, getDashboardStats);
export default router;
