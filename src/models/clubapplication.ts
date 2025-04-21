import mongoose, { Document, Types } from "mongoose";
import { IClub } from "./club";
import { IFaculty } from "./faculty";

export interface IClubApplication extends Document {
  Club: Types.ObjectId | IClub,
  Status: "Not Enough Members" | "Waiting" | "Accepted" | "Rejected",
  ApprovedBy: Types.ObjectId | IFaculty,
  ApprovedOn?: Date
}

const clubApplicationSchema = new mongoose.Schema<IClubApplication>({
  Club: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true, index:true },
  Status: { 
    type: String, 
    enum: ["Not Enough Members", "Waiting", "Accepted", "Rejected"], 
    default: "Not Enough Members", 
    required: true 
  },
  ApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", required: true },
  ApprovedOn: { type: Date }
});

export const ClubApplication = mongoose.model<IClubApplication>( "ClubApplication", clubApplicationSchema );