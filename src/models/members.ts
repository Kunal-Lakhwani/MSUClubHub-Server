import mongoose, { Document, Types } from "mongoose";
import { IFlair } from "./flair";
import { IClub } from "./club";
import { IUser } from "./user";


export interface IMember extends Document {
  Club: Types.ObjectId | IClub,
  UserID: Types.ObjectId | IUser,  
  Username:string,
  Flairs: Types.ObjectId[] | IFlair[],
}

const memberSchema = new mongoose.Schema<IMember>({
  Club: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true, index:true },
  UserID: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index:true },
  Username: { type: String, required: true },
  Flairs: { type: [ mongoose.Schema.Types.ObjectId ], ref: "Flair", default: [], required: true, index:true }
});

export const Member = mongoose.model( "Member", memberSchema );