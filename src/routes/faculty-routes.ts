import express from "express";
import controller from "../controllers/faculty-controller";

const facultyRouter = express.Router();

facultyRouter.post("/Login", controller.Login);
facultyRouter.post("/Refresh", controller.Refresh);
facultyRouter.post("/Invite", controller.InviteFaculty);
facultyRouter.post("/SetupAccount", controller.SetupFacultyAccount);

export default facultyRouter;