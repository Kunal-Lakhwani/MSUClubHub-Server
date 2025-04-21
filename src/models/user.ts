import mongoose, { Document, Types } from "mongoose";
import { IClub } from "./club";

export interface IUser extends Document {
  PRN: number,
  FirstName: string,
  MiddleName: string,
  LastName: string,
  Email: string,
  PasswordHash: string,
  Salt: string,
  Registered_Club?: Types.ObjectId | IClub,
  Followed_Clubs: Types.ObjectId[] | IClub[]
}

const userSchema = new mongoose.Schema<IUser>({
  PRN: { type: Number, required: true, unique: true, index: true},
  FirstName: { type: String, required: true},
  MiddleName: { type: String, required: true},
  LastName: { type: String, required: true},
  Email: { type: String, required: true, unique: true},
  PasswordHash: { type: String, required: true},
  Salt: { type: String, required: true},
  Registered_Club: { type: mongoose.Schema.Types.ObjectId, ref: "Club", index:true },
  Followed_Clubs: { type: [ mongoose.Schema.Types.ObjectId ], ref: "Club", default: [], index:true },
});

export const User = mongoose.model<IUser>( "User", userSchema );