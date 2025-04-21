import mongoose, { Types } from "mongoose";
import { IUser } from "./user";

export interface ILikedBy{
  User: Types.ObjectId | IUser,
  LikedOn: Date,
}

export const likedBySchema = new mongoose.Schema<ILikedBy>({
  User: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},  
  LikedOn: { type: Date, default: new Date() }
}, { _id: false })