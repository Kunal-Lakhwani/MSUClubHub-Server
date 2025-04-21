import mongoose, { Document, Types } from "mongoose";

export interface ISettings extends Document {
  Minimum_Members:number,
}

const settingsSchema = new mongoose.Schema<ISettings>({
  Minimum_Members: { type: Number, default: 3, required: true }
});

export const Settings = mongoose.model( "Settings", settingsSchema );