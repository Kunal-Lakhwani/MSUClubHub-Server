import { Request, Response } from "express";
import { hash, genSalt } from "bcrypt";
import * as jwt from "jsonwebtoken";
import dotenv from "dotenv";

import { IUser, User } from "../models/user";
import { Club, IClub } from "../models/club";
import { IMember, Member } from "../models/members";

dotenv.config();

interface AsyncFunction {
	(req: Request, res: Response): Promise<void>;
}

interface UserController {
	Login: AsyncFunction;
	Refresh: AsyncFunction;
	Register: AsyncFunction;
	RegisterClub: AsyncFunction;
	LogOut: AsyncFunction;
}

const getUserDetails = async ( existingUser:IUser ) => {
	const retval:any = {
		ID: existingUser._id,
		PRN: existingUser.PRN,
		firstName: existingUser.FirstName,
		middleName: existingUser.MiddleName,
		lastName: existingUser.LastName,
		emailID: existingUser.Email,		
	}
	if ( existingUser.Registered_Club !== undefined ){
		const populatedClub = await existingUser.populate<{ Registered_Club: IClub }>("Registered_Club");
		retval.Club = { ID: populatedClub.Registered_Club._id , Name: populatedClub.Registered_Club.Name }
	}
	return retval;
}

const getAccessToken = async ( PRN:string ) => {
  const existingUser = await User.findOne({ PRN: PRN });
  if ( !existingUser ){
    return null;
  }
	const token = jwt.sign(
		await getUserDetails(existingUser),
		process.env.JWT_ACCESS_SECRET as string,
		{ expiresIn: "10m" }
	);  
  return token;
}

const getRefreshToken = async ( PRN:string, rememberMe:boolean ) => {

  const refreshExpire = rememberMe ? "2d" : "2h";  
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

const Login: AsyncFunction = async (req: Request, res: Response) => {
  try {
    Club.createCollection();
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

			const userDetails = await getUserDetails(existingUser);
			const accessToken = await getAccessToken(PRN);
			const refreshToken = await getRefreshToken(PRN, rememberMe);

			res.cookie( "jwt_access", accessToken, {
				httpOnly: true,
        sameSite: 'lax',
        secure: false,
				maxAge: 10 * 60 * 1000
			})
			res.cookie( "jwt_refresh", refreshToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
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

const Refresh: AsyncFunction = async (req: Request, res: Response) => {
	try {
		if (req.cookies?.jwt_refresh) {
			const refreshToken = req.cookies.jwt_refresh;

			jwt.verify(
				refreshToken,
				process.env.JWT_REFRESH_SECRET as string,
				async ( err: jwt.VerifyErrors | null, decoded: jwt.JwtPayload | string | undefined ) => {
					if (err) {
            
						res.status(406).json({ message: "Unauthorized" });

					} else {

            const userPRN:string = (decoded as jwt.JwtPayload).PRN;
						const accessToken = getAccessToken(userPRN);
            
            if ( !accessToken ){
              res.status(404).json({ msg: `User ${userPRN} not found` });
              return;            
            }
            res.cookie( "jwt_access", accessToken, {
              httpOnly: true,
              sameSite: 'lax',
              secure: false,
              maxAge: 10 * 60 * 1000
            })
						const infoPayload = await getUserDetails( await User.findOne({ PRN: userPRN }) as IUser );
            res.status(200).json({ msg: `Refreshed token for ${userPRN}`, payload: infoPayload});
					}
				}
			);
		} else {
			res.status(406).json({ message: "Unauthorized" });
		}
	} catch (error) {}
};

const Register: AsyncFunction = async (req: Request, res: Response) => {
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

const RegisterClub: AsyncFunction = async (req: Request, res: Response) => {
	try {
		const { clubID, clubName, userID, userName, flairs } = req.body;
		const newMember: IMember = new Member({
			Club: clubID,
			UserID: userID,
			Username: userName,
			Flairs: flairs,
		});
		await newMember.save();
		await User.findByIdAndUpdate( userID, { Registered_Club: clubID } );
		res.status(200).json({msg: `Successfully joined ${clubName}`});
	} catch (error) {
		res.status(500).json({ msg: `Internal Server Error: ${error}` });
	}
};

const LogOut: AsyncFunction = async ( req:Request, res:Response ) => {
	try {
		res.clearCookie("jwt_access");
		res.clearCookie("jwt_refresh");
		res.status(200).json({ msg: "Logged out successfully" });
	} catch (error) {
		
	}
}

const controller: UserController = { Login, Refresh, Register, RegisterClub, LogOut };

export default controller;
