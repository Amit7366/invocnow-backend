import express from "express";
import cors from "cors";
import { errorHandler } from "./middlewares/error.middleware";
import invoiceRoutes from "./routes/invoice.routes";
import authRoutes from "./routes/auth.routes";
import analyticsRoutes from "./routes/analytics.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.use(errorHandler);
app.use("/api/v1/invoices", invoiceRoutes);
app.use("/api/v1", authRoutes);
app.use("/api/v1/analytics", analyticsRoutes);

app.use(errorHandler); // ✅ last


export default app;
