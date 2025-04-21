import { Request, RequestHandler, Response } from "express";
import { hash, genSalt } from "bcrypt";
import * as jwt from "jsonwebtoken";

import { IUser, User } from "../models/user";
import { Club, IClub } from "../models/club";
import { IMember, Member } from "../models/members";
import { ISettings, Settings } from "../models/settings";
import { ClubApplication } from "../models/clubapplication";
import { Types } from "mongoose";


interface UserController {
	Login: RequestHandler;
	Refresh: RequestHandler;
	Register: RequestHandler;
	RegisterClub: RequestHandler;
	LogOut: RequestHandler;
	FollowClub:RequestHandler;
}

const formatUserDetails = async ( existingUser:IUser ) => {
	const retval:any = {
		ID: existingUser._id,
		PRN: existingUser.PRN,
		firstName: existingUser.FirstName,
		middleName: existingUser.MiddleName,
		lastName: existingUser.LastName,
		emailID: existingUser.Email,		
		role: "Student",
		club: { ID: "", Name: "", DisplayName: "", memberID: "", IsModerator: false }
	}
	if ( existingUser.Registered_Club !== undefined ){
		const populatedClub = await existingUser.populate<{ Registered_Club: IClub }>("Registered_Club");
		const membershipInfo = await Member.findOne({ Club: populatedClub.Registered_Club._id, User: existingUser._id })
		retval.club = { 
			ID: populatedClub.Registered_Club._id , 
			Name: populatedClub.Registered_Club.Name,
			DisplayName: populatedClub.Registered_Club.Display_Name,
			MemberID: membershipInfo?._id,
			// @ts-ignore
			IsModerator: populatedClub.Registered_Club.Moderators.includes( populatedClub._id ),
		}
	}
	return retval;
}

const getAccessToken = async ( PRN:string ) => {
  const existingUser = await User.findOne({ PRN: PRN });
  if ( !existingUser ){
    return null;
  }
	const token = jwt.sign(
		await formatUserDetails(existingUser),
		process.env.JWT_ACCESS_SECRET as string,
		{ expiresIn: "1h" }
	);  
  return token;
}

const getRefreshToken = async ( PRN:string, rememberMe:boolean ) => {

  const refreshExpire = rememberMe ? "3d" : "2h"; 
  const token = jwt.sign(
    {
      PRN: PRN,
      RememberMe: rememberMe,
    },
    process.env.JWT_REFRESH_SECRET as string,
    { expiresIn: refreshExpire }
  );
  return token;
}

const Login: RequestHandler = async (req: Request, res: Response) => {
  try {
		const { PRN, password } = req.body;    

    // Just in-case it gets converted to string in which case "false" becomes a truthy value
    const rememberMe = req.body.rememberMe == true || req.body.rememberMe == "true";

		const existingUser = await User.findOne({ PRN: PRN });
		if (!existingUser) {
			res.status(400).json({
				msg: `No user account with PRN ${PRN} found`,
			});
			return;
		}

		if ((await hash(password, existingUser.Salt)) === existingUser.PasswordHash) {    

			const userDetails = await formatUserDetails(existingUser);
			const accessToken = await getAccessToken(PRN);
			const refreshToken = await getRefreshToken(PRN, rememberMe);

			res.cookie( "jwt_access", accessToken, {
				httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === "deployed",
				maxAge: 1 * 60 * 60 * 1000
			})
			res.cookie( "jwt_refresh", refreshToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === "deployed",
        maxAge: rememberMe ? 3 * 24 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000,
      })
			
      res.status(200).json({ msg: `Welcome ${existingUser.FirstName}`, payload:userDetails })
			return;
		} else {
			res.status(400).json({ msg: "Incorrect password" });
		}
	} catch (error) {
		console.log(error)
		res.status(500).json({ msg: `Internal server error: ${error}` });
	}
};

const Refresh: RequestHandler = async (req: Request, res: Response) => {
	try {
		if (req.cookies?.jwt_refresh) {
			const refreshToken = req.cookies.jwt_refresh;
			const token = jwt.verify( refreshToken, process.env.JWT_REFRESH_SECRET as string ) as jwt.JwtPayload;			
			console.log(token.exp as number * 1000, Date.now() );
			if ( token.exp as number * 1000 < Date.now() ){
				throw new Error();
			}
			const userPRN:string = token.PRN;
			const accessToken = await getAccessToken(userPRN);            
      if ( !accessToken ){
				res.clearCookie('jwt_refresh');
        res.status(404).json({ msg: `User ${userPRN} not found` });
        res.end();
      }
      res.cookie( "jwt_access", accessToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === "deployed",
        maxAge: 10 * 60 * 1000
      })
			const infoPayload = await formatUserDetails( await User.findOne({ PRN: userPRN }) as IUser );
      res.status(200).json({ msg: `Refreshed token for ${userPRN}`, payload: infoPayload});
			res.end();
		} else {
			throw new Error();
		}
	} catch (error) {
		console.log("Error, clearing cookies");
		res.clearCookie("jwt_refresh", {
			httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === "deployed",
		});
		res.status(406).json({ message: "Unauthorized" });
		res.end();
	}
};

const Register: RequestHandler = async (req: Request, res: Response) => {
	try {
		const { PRN, firstName, middleName, lastName, email, password } = req.body;

		const existingUser = await User.findOne({ PRN: PRN });

		if (existingUser) {
			res.status(400).json({ msg: `User already exists` });
			return;
		}

		const salt = await genSalt(10);
		const hashedPassword = await hash(password, salt);
		const newUser: IUser = new User({
			PRN: PRN,
			FirstName: firstName,
			MiddleName: middleName,
			LastName: lastName,
			Email: email,
			PasswordHash: hashedPassword,
			Salt: salt,
		});
		await newUser
			.save()
			.then(() => {
				res.status(200).json({
					msg: `Successfully created user ${firstName}`,
				});
			})
			.catch((err) => {
				res.status(500).json({ msg: `Internal Server Error: ${err}` });
			});
	} catch (error) {
		res.status(500).json({ msg: `Internal Server Error: ${error}` });
	}
};

const RegisterClub: RequestHandler = async (req: Request, res: Response) => {
	try {
		const { clubName, userID, userName, flair } = req.body;
		const existingClub = await Club.findOne({ Name: clubName });
		if ( !existingClub ){
			res.status(404).json({ msg: "No such club exists" })
			res.end();
			return;
		}
		const newMember: IMember = new Member({
			Club: existingClub._id,
			User: userID,
			Username: userName,
		});
		if ( flair ){
			newMember.Flair = flair
		}
		await newMember.save();
		await User.findByIdAndUpdate( userID, { Registered_Club: existingClub._id } );
		
		const SiteSettings = await Settings.findOne({}) as ISettings;
		const MemberCount = await Member.countDocuments( { Club: existingClub._id } );
		if ( MemberCount === SiteSettings.Minimum_Members ){
			await ClubApplication.findOneAndUpdate({ Club: existingClub._id }, { Status: "Waiting" });
		}
		res.status(200).json(
		{
			msg: `Successfully joined ${clubName}`, 
			clubShort:{
				ID: existingClub._id,
				Name: existingClub.Name,
				DisplayName: existingClub.Display_Name,
				MemberID: newMember._id,		
			}
		});
	} catch (error) {
		console.log(error);
		res.status(500).json({ msg: `Internal Server Error: ${error}` });
	}
};

const FollowClub: RequestHandler = async (req: Request, res:Response) => {
	try {
		const { userID, clubID } = req.body;
		const UserInfo = await User.findById(userID);
		if ( !UserInfo ){
			res.status(404).json({msg: "Invalid User"});
			res.end();
			return;
		}
		const ClubInfo = await Club.findById(clubID);
		if ( !ClubInfo ){
			res.status(404).json({ msg: "Club Does not exist" });
			res.end();
			return;
		}
		UserInfo.Followed_Clubs.push( clubID );
		await UserInfo.save();
		res.status(200).json({ msg: `You have followed the Club ${ClubInfo.Display_Name}` });
	} catch (error) {
		res.status(500).json({ msg: "Internal server Error" });
	}
}

const LogOut: RequestHandler = async ( req:Request, res:Response ) => {
	try {
		res.clearCookie("jwt_access");
		res.clearCookie("jwt_refresh");
		res.status(200).json({ msg: "Logged out successfully" });
	} catch (error) {
		res.status(500).json({ msg: error })
	}
}

const controller: UserController = { Login, Refresh, Register, RegisterClub, LogOut, FollowClub };

export default controller;
