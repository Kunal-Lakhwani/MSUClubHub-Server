import mongoose, { Document, Types } from "mongoose";

export interface IFaculty extends Document {
  FirstName: string,
  MiddleName: string,
  LastName: string,
  Email: string,
  Role: "Admin" | "Faculty",
  Status: "Invited" | "Active",
  PasswordHash: string,
  Salt: string,
}

const facultySchema = new mongoose.Schema<IFaculty>({
  FirstName: { type: String, required: true, default: ""},
  MiddleName: { type: String, required: true, default: ""},
  LastName: { type: String, required: true, default: ""},
  Email: { type: String, required: true, unique: true},  
  Role: { type: String, enum: [ "Admin", "Faculty" ], default: "Faculty" },
  Status: { type:String, enum: [ "Invited", "Active" ], default: "Invited" },
  PasswordHash: { type: String, required: true},
  Salt: { type: String, required: true},
});

export const Faculty = mongoose.model<IFaculty>( "Faculty", facultySchema );