import mongoose, { Document, Types } from "mongoose";
import { IClub } from "./club";
import { IMember } from "./members";
import { ICommunityPost} from "./communitypost";
import { ILikedBy, likedBySchema } from "./likedby";

export interface IPostComment extends Document {
  Club: Types.ObjectId | IClub,
  Author: Types.ObjectId | IMember,  
  Post: Types.ObjectId | ICommunityPost,
  Replies: Types.ObjectId[] | IPostComment[],
  isTopLevel: boolean,
  Body: string,
  createdAt: Date,
  updatedAt: Date,
  LikedBy: ILikedBy[],
  isDeleted: Boolean,
}

const postCommentSchema = new mongoose.Schema<IPostComment>({
  Club: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true, index:true },
  Author: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true, index:true },
  Post: { type: mongoose.Schema.Types.ObjectId, ref: "CommunityPost", required: true, index:true },
  Replies: { type: [mongoose.Schema.Types.ObjectId], ref: "PostComment", index:true, default: [] },
  isTopLevel: { type: Boolean, required: true },
  Body: { type:String, required: true },
  LikedBy: { type: [ likedBySchema ], default: [] },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

postCommentSchema.index({ "LikedBy.User": 1 });

export const PostComment = mongoose.model( "PostComment", postCommentSchema );