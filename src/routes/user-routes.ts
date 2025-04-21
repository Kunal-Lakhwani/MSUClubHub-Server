import express from "express";
import controller from "../controllers/user-controller";

const userRouter = express.Router();

userRouter.post("/Register", controller.Register);
userRouter.post("/Login", controller.Login);
userRouter.post("/Refresh", controller.Refresh);
userRouter.post("/Logout", controller.LogOut);
userRouter.post("/JoinClub", controller.RegisterClub);

export default userRouter;