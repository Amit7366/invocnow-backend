import { IUserPayload } from "../interfaces/auth.interface";

declare global {
  namespace Express {
    interface Request {
      user?: IUserPayload;
    }
  }
}

export {};
