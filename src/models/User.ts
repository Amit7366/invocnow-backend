import { Schema, model, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  name: string;
  googleId: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    googleId: { type: String, required: true },
  },
  { timestamps: true }
);

const User = model<IUser>("User", UserSchema);

export default User;
