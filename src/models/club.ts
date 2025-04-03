import mongoose, { Document, Types } from "mongoose";
import { IUser } from "./user";

export interface IClub extends Document {
  Name:string,
  Profile_photo:string,
  Banner_photo:string,
  Description:string,
  Admins: Types.ObjectId[] | IUser[]
}

const clubSchema = new mongoose.Schema<IClub>({
  Name: { type:String, required: true },
  Profile_photo: { type:String, required: true },
  Banner_photo: { type:String, required: true },
  Description: { type:String, required: true },
  Admins: { type:[ mongoose.Schema.Types.ObjectId ], ref: "User", default: [], required: true, index: true },
});

export const Club = mongoose.model<IClub>( "Club", clubSchema );