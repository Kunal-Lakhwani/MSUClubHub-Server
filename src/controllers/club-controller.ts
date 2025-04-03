import { Request, Response } from "express";
import { Club, IClub } from "../models/club";
import multer from "multer";
import fs from "fs";
import { ImageDirectories } from "../models/Utils";
import path from "path";

const storage = multer.diskStorage({
  destination: function (req:Request, file:Express.Multer.File, saveLocation:Function){
    
    let uploadPath = ''
    if ( file.fieldname == "profilePicture" ) uploadPath = path.join( process.cwd(), "src/Images", ImageDirectories.ClubProfile)
    else if ( file.fieldname == "bannerImage" ) uploadPath = path.join( process.cwd(), "src/Images", ImageDirectories.ClubBanner)

    // Ensure the directory exists; if not, create it
    fs.mkdir(uploadPath, { recursive: true }, (err) => {
      if (err) {
        console.error('Error creating directory:', err);
        saveLocation(err, uploadPath);
      } else {
        saveLocation( null, uploadPath )
      }
    });
  },
  filename: function ( req:Request, file:Express.Multer.File, callback:Function ){
    let newFilename = req.body.clubName.replace(" ", "_");
    if ( file.fieldname == "profilePicture" ) newFilename += "_Profile";
    else if ( file.fieldname == "bannerImage" ) newFilename += "_Banner";

    const fileMime = file.mimetype.split("/");
    const fileExtension = "." + fileMime[fileMime.length - 1];
    newFilename += fileExtension;
    try {
      callback(null, newFilename)
    } catch (error) {
      // @ts-ignore
      callback({ msg: error.message });
    }
  }
});


const fileFilter = (req:Request, file:Express.Multer.File, cb:Function) => {
  if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file format"), false);
  }
};

export const upload = multer({ storage, fileFilter });

interface AsyncFunction {
  (req: Request, res: Response):Promise<void>
}

interface ClubController {
  CreateClub:AsyncFunction,
  EditClub:AsyncFunction,
  AssignAdmin:AsyncFunction,
  RemoveAdmin:AsyncFunction,
}

const CreateClub:AsyncFunction = async ( req:Request, res:Response ) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      res.status(400).json({ error: "No files uploaded" });
      return;
    }

    const { profilePicture, bannerImage } = req.files as { 
      profilePicture?: Express.Multer.File[]; 
      bannerImage?: Express.Multer.File[];
    };

    if (!profilePicture || !bannerImage) {
      res.status(400).json({ msg: "Both profile photo and banner image are required" });
      return;
    }
    
    const { clubName, clubDescription, userID } = req.body;
    const newClub:IClub = new Club({ 
      Name: clubName, 
      Description: clubDescription, 
      Profile_photo: profilePicture[0].filename,
      Banner_photo: bannerImage[0].filename, 
      Admins: [ userID ]});    

    await newClub.save();
    res.status(200).json({ msg: `${clubName} created successfully` });

  } catch (error) {
    res.status(500).json({ msg: error });
  }
}

const test:AsyncFunction = async ( req:Request, res:Response ) => {

}

const EditClub:AsyncFunction = async ( req:Request, res:Response ) => {

}

const AssignAdmin:AsyncFunction = async ( req:Request, res:Response ) => {

}

const RemoveAdmin:AsyncFunction = async ( req:Request, res:Response ) => {

}

const controller:ClubController = { CreateClub, EditClub, AssignAdmin, RemoveAdmin }

export default controller