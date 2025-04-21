import mongoose, { Document, Types } from "mongoose";
import { IClub } from "./club";

export interface IFlair extends Document {
  Club: Types.ObjectId | IClub,
  Type: "Member" | "Post",
  Title:string,
  Background:string,
  Foreground:string,
}

const flairSchema = new mongoose.Schema<IFlair>({
  Club: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true, index:true },
  Type: { type: String, enum: ["Member", "Post"], required: true },
  Title: { type:String, required: true },
  Background: { type:String, required:true },  
  Foreground: { type:String, required:true },
});

export const Flair = mongoose.model( "Flair", flairSchema );