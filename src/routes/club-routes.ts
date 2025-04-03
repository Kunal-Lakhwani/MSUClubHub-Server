import express from "express";
import controller, { upload } from "../controllers/club-controller";

const clubRouter = express.Router();

clubRouter.post( "/CreateClub", upload.fields(
    [
      {name: "profilePicture",maxCount: 1},
      {name: "bannerImage",maxCount: 1}
    ]
), controller.CreateClub);

clubRouter.post( "/EditClub", upload.fields(
  [
    {name: "profilePhoto",maxCount: 1},
    {name: "bannerImage",maxCount: 1}
  ]
), controller.EditClub);

export default clubRouter;