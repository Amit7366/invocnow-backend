import { Response } from "express";
import { ApiResponse } from "./apiResponse";

export const sendSuccess = <T>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T
) => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
  };

  return res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  statusCode: number,
  message: string,
  error?: any
) => {
  const response: ApiResponse<null> = {
    success: false,
    message,
    error,
  };

  return res.status(statusCode).json(response);
};
