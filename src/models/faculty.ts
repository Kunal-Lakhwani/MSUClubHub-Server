import mongoose, { Document, Types } from "mongoose";

export interface IFaculty extends Document {
  FirstName: string,
  MiddleName: string,
  LastName: string,
  Email: string,
  PasswordHash: string,
  Salt: string,
}

const facultySchema = new mongoose.Schema<IFaculty>({
  FirstName: { type: String, required: true},
  MiddleName: { type: String, required: true},
  LastName: { type: String, required: true},
  Email: { type: String, required: true, unique: true},
  PasswordHash: { type: String, required: true},
  Salt: { type: String, required: true},
});

export const User = mongoose.model<IFaculty>( "Faculty", facultySchema );