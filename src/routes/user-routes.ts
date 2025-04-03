import express, { Request, Response } from "express";
import controller from "../controllers/user-controller";

const userRouter = express.Router();

userRouter.post("/UserLogin", controller.Login);
userRouter.post("/Refresh", controller.Refresh);
userRouter.post("/Logout", controller.LogOut);
userRouter.post("/RegisterUser", controller.Register);
userRouter.post("/JoinClub", controller.RegisterClub);

export default userRouter;