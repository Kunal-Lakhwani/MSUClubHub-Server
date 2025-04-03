import mongoose, { Document, Types } from "mongoose";
import { IClub } from "./club";

export interface IFlair extends Document {
  Club: Types.ObjectId | IClub,
  Icon:string,
  Text:string
}

const flairSchema = new mongoose.Schema<IFlair>({
  Club: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true, index:true },
  Icon: { type:String, required: true },
  Text: { type:String, required: true },
});

export const Flair = mongoose.model( "Flair", flairSchema );