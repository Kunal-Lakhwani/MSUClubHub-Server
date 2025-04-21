import mongoose, { Document, Types } from "mongoose";
import { IUser } from "./user";

export interface IClub extends Document {
  Name:string,
  Display_Name:string,
  Profile_photo:string,
  Banner_photo?:string,
  Description:string,
  Moderators: Types.ObjectId[] | IUser[],
  isApproved:boolean,
  createdAt:Date,
  updatedAt:Date
}

const clubSchema = new mongoose.Schema<IClub>({
  Name: { type:String, required: true, unique:true, index:true },
  Display_Name: { type:String, required: true },
  Profile_photo: { type:String, required: true },
  Banner_photo: { type:String },
  Description: { type:String, required: true },
  Moderators: { type:[ mongoose.Schema.Types.ObjectId ], ref: "User", default: [], required: true, index: true },
  isApproved: { type: Boolean, default: false }
}, { timestamps: true });

export const Club = mongoose.model<IClub>( "Club", clubSchema );