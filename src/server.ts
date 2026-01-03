import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { connectDB } from "./config/db";

connectDB();

process.on("uncaughtException", (error) => {
  console.error("UNCAUGHT EXCEPTION 💥", error);
  // Do NOT exit immediately in dev
});

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION 💥", reason);
});


app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
