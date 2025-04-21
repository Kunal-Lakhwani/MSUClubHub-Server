import mongoose, { Document, Types } from "mongoose";
import { IFlair } from "./flair";
import { IClub } from "./club";
import { IUser } from "./user";

export interface IMember extends Document {
  Club: Types.ObjectId | IClub,
  User: Types.ObjectId | IUser,  
  Username:string,
  Flair?: Types.ObjectId | IFlair,
}

const memberSchema = new mongoose.Schema<IMember>({
  Club: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true, index:true },
  User: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index:true },
  Username: { type: String, required: true },
  Flair: { type: mongoose.Schema.Types.ObjectId, ref: "Flair", index:true }
});

export const Member = mongoose.model( "Member", memberSchema );