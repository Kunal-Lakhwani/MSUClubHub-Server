import { Request, RequestHandler, Response } from "express";
import { Club, IClub } from "../models/club";
import multer from "multer";
import fs from "fs";
import { ImageDirectories } from "../models/Utils";
import path from "path";
import { Flair } from "../models/flair";
import { User } from "../models/user";
import { Member } from "../models/members";
import { ClubApplication } from "../models/clubapplication";

const storage = multer.diskStorage({
  destination: function (req:Request, file:Express.Multer.File, saveLocation:Function){
    
    let uploadPath = ''
    if ( file.fieldname === "profilePicture" ) uploadPath = path.join( process.cwd(), "public", "Images", ImageDirectories.ClubProfile)
    else if ( file.fieldname === "bannerImage" ) uploadPath = path.join( process.cwd(), "public", "Images", ImageDirectories.ClubBanner)

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
    let newFilename = req.body.clubName;
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
interface ClubController {
  CreateClub:RequestHandler,
  EditClub:RequestHandler,
  FetchClub:RequestHandler,
  AddModerator:RequestHandler,
  RemoveModerator:RequestHandler,
}

const CreateClub:RequestHandler = async ( req:Request, res:Response ) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      res.status(400).json({ error: "No files uploaded" });
      return;
    }

    const { profilePicture, bannerImage } = req.files as { 
      profilePicture?: Express.Multer.File[]; 
      bannerImage?: Express.Multer.File[];
    };

    if (!profilePicture) {
      res.status(400).json({ msg: "Profile photo is required" });
      return;
    }
    
    const { clubName, clubDisplayName, clubDescription, username, userID } = req.body;
    const newClub:IClub = new Club({ 
      Name: clubName, 
      Display_Name: clubDisplayName,
      Description: clubDescription, 
      Profile_photo: profilePicture[0].filename,
      Moderators: [ userID ]}
    );

    if ( bannerImage ){
      newClub.Banner_photo = bannerImage[0].filename;
    }

    await newClub.save();
    const newApplication = new ClubApplication({ Club: newClub._id, Status: "Not Enough Members" });
    await User.findByIdAndUpdate( userID, { Registered_Club: newClub._id } );
    const newMember = new Member({ 
      Club: newClub._id,
      User: userID,
      Username: username,
    });
    await newMember.save();
    await newApplication.save();    
    res.status(200).json({ msg: `${clubName} created successfully` }, );

  } catch (error) {
    res.status(500).json({ msg: error });
  }
}

const FetchClub:RequestHandler = async ( req:Request, res:Response ) => {
  try {
    const { clubName } = req.params;
    const clubInfo = await Club.findOne({ Name: clubName });
    if ( !clubInfo ){
      res.status(404).json({ msg: `No Club with name ${clubName} found` });
      return;
    }
    const resVal:any = {
      ID: clubInfo._id,
      clubName: clubInfo.Name,
      displayName: clubInfo.Display_Name,
      clubDescription: clubInfo.Description,
      profile: `${process.env.SERVER_URL}/Images/${ImageDirectories.ClubProfile}/${clubInfo.Profile_photo}`,
      moderators: clubInfo.Moderators,
      isApproved: clubInfo.isApproved,
      createdOn: clubInfo.createdAt,
      Flairs: []
    }

    if ( clubInfo.Banner_photo ){
      resVal.banner = `${process.env.SERVER_URL}/Images/${ImageDirectories.ClubBanner}/${clubInfo.Banner_photo}`
    }
    
    const flairs = await Flair.find({ Club: clubInfo._id });
    
    if ( flairs ){
      resVal.Flairs = flairs.map( flair => { return {
        ID: flair._id,
        Title: flair.Title,
        BGColor: flair.Background,
        FGColor: flair.Foreground
      }})
    }

    res.status(200).json(resVal);
  } catch (error) {
    res.status(500).json({ msg: error });
  }
}

const EditClub:RequestHandler = async ( req:Request, res:Response ) => {
  try {    

    const { profilePicture, bannerImage } = req.files as { 
      profilePicture?: Express.Multer.File[]; 
      bannerImage?: Express.Multer.File[];
    };
    
    const { clubID, clubName, clubDisplayName, clubDescription } = req.body;
    const existingClub = await Club.findById(clubID);

    if ( !existingClub ){
      res.status(404).json({msg: "No such club exists"});
      res.end();
      return;
    }

    existingClub.Display_Name = clubDisplayName;
    existingClub.Description = clubDescription;

    if ( bannerImage ){
      if ( existingClub.Banner_photo ){
        const prevPath = path.join( process.cwd(), "public", "Images", ImageDirectories.ClubProfile, 
          existingClub.Banner_photo)

        fs.unlink(prevPath, err => {
          console.log(err);
        });
      }
      existingClub.Banner_photo = bannerImage[0].filename;
    }
    
    if ( profilePicture ){
      const prevPath = path.join( process.cwd(), "public", "Images", ImageDirectories.ClubProfile, 
        existingClub.Profile_photo)

      fs.unlink(prevPath, err => {
        console.log(err);
      });
      existingClub.Profile_photo = profilePicture[0].filename;
    }

    await existingClub.save();

    res.status(200).json({ msg: `${clubName} updated successfully` }, );

  } catch (error) {
    res.status(500).json({ msg: error });
  }
}

const AddModerator:RequestHandler = async ( req:Request, res:Response ) => {

}

const RemoveModerator:RequestHandler = async ( req:Request, res:Response ) => {

}

const controller:ClubController = { CreateClub, EditClub, AddModerator, RemoveModerator, FetchClub }

export default controller