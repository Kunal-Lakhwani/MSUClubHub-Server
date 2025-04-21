import mongoose, { Document, Types } from "mongoose";
import { IClub } from "./club";
import { IFlair } from "./flair";
import { IMember } from "./members";
import { ILikedBy, likedBySchema } from "./likedby";

export interface ICommunityPost extends Document {
  Club: Types.ObjectId | IClub,
  Author: Types.ObjectId | IMember,
  PostURI: string,
  Type: "Post" | "News",
  createdAt: Date,
  updatedAt: Date,
  Flair?: Types.ObjectId | IFlair,
  Title:string,
  Body?:string,
  Images?: string[],
  LikedBy: ILikedBy[],
  isDeleted?: Boolean,
}

const communityPostSchema = new mongoose.Schema<ICommunityPost>({
  Club: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true, index:true },
  Author: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true, index:true },
  PostURI: { type: String, required:true, unique: true, index: true },
  Type: { type: String, enum: ["Post", "News"], required: true },
  Flair: { type: mongoose.Schema.Types.ObjectId, ref: "Flair", index:true },
  Title: { type:String, required: true },
  Body: { type:String },
  Images: { type: [ String ], default: [] },
  LikedBy: { type: [ likedBySchema ], default: [], index: true },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

communityPostSchema.index({ "LikedBy.User": 1 });

export const CommunityPost = mongoose.model( "CommunityBoard", communityPostSchema );