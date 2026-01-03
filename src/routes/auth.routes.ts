import { Router } from "express";
import { googleAuth } from "../controllers/auth.controller";



const router = Router();

router.post("/auth/google" ,googleAuth);
// router.get("/", getInvoices);
// router.get("/:id", getInvoiceById);
// router.put("/:id", updateInvoice);

export default router;
