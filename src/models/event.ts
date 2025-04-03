
// ID
// Club				FK to Club who made this event
// Poster				( optional ) path to image for event poster
// Description
// Registration_link		Link to google forms for registration
// DateTimes			Array of DateTimes for the event

import mongoose, { Document, Types, Date } from "mongoose";
import { IClub } from "./club";

export interface IEvent extends Document{  
  Club: Types.ObjectId | IClub,
  Poster: string,
  Description: string,
  Registration_link: string,
  DateTimes: Date[]
}

const eventSchema = new mongoose.Schema<IEvent>({
  Club: { required: true, type: mongoose.Schema.Types.ObjectId, ref: "Club", index: true },
  Poster: { required: false, type: String },

}, {timestamps: true});

export const Event = mongoose.model("Event", eventSchema);