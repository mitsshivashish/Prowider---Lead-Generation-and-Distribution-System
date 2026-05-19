import { Response } from "express";
import { ZodError } from "zod";

export interface ApiError {
  message: string;
  details?: any;
}

export const sendError = (
  res: Response,
  statusCode: number,
  message: string,
  details?: any
) => {
  const errorResponse: ApiError = { message };
  if (details) {
    errorResponse.details = details;
  }
  return res.status(statusCode).json(errorResponse);
};

export const handleZodError = (res: Response, error: ZodError) => {
  return sendError(res, 400, "Validation failed", error.flatten());
};

export const sendInternalServerError = (res: Response, error: unknown) => {
  console.error("Internal Server Error:", error);
  return sendError(res, 500, "Internal Server Error");
};