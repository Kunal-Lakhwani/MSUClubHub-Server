import { Request, RequestHandler, Response } from "express";
import { hash, genSalt } from "bcrypt";
import * as jwt from "jsonwebtoken";
import { Faculty, IFaculty } from "../models/faculty";
import nodemailer, { SendMailOptions } from "nodemailer";

interface FacultyController{
  InviteFaculty:RequestHandler,
	SetupFacultyAccount:RequestHandler,
  Login:RequestHandler,
  Refresh:RequestHandler,
}

const generatePassword = (length = 20, 
	characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz~!@-#$') =>
{
	return Array.from(crypto.getRandomValues(new Uint32Array(length)))
							.map((x) => characters[x % characters.length])
							.join('')
}

const getAccessToken = async ( email:string ) => {
  const existingFaculty = await Faculty.findOne({ Email: email });
  if ( !existingFaculty ){
    return null;
  }
	const token = jwt.sign(
		await formatFacultyDetails(existingFaculty),
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

const formatFacultyDetails = async ( existingFaculty:IFaculty ) => {
  return {
    ID: existingFaculty._id,
		firstName: existingFaculty.FirstName,
		middleName: existingFaculty.MiddleName,
		lastName: existingFaculty.LastName,
		emailID: existingFaculty.Email,		    
    Role: existingFaculty.Role,
	}
}

const smtpHandler = nodemailer.createTransport({
	service: "Gmail",
	auth: {
		user: process.env.EMail_ID,
		pass: process.env.EMail_Password
	}
})

const Login: RequestHandler = async (req: Request, res: Response) => {
  try {
		const { PRN: email, password } = req.body;    

    // Just in-case it gets converted to string in which case "false" becomes a truthy value
    const rememberMe = req.body.rememberMe == true || req.body.rememberMe == "true";

		const existingFaculty = await Faculty.findOne({ email: email });
		if (!existingFaculty) {
			res.status(400).json({
				msg: `No faculty account found`,
			});
			return;
		}

		if ((await hash(password, existingFaculty.Salt)) === existingFaculty.PasswordHash) {    

			const userDetails = await formatFacultyDetails(existingFaculty);
			const accessToken = await getAccessToken(email);
			const refreshToken = await getRefreshToken(email, rememberMe);

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
			
      res.status(200).json({ msg: `Welcome ${existingFaculty.FirstName}`, payload:userDetails })
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

			jwt.verify(
				refreshToken,
				process.env.JWT_REFRESH_SECRET as string,
				async ( err: jwt.VerifyErrors | null, decoded: jwt.JwtPayload | string | undefined ) => {
					if (err) {
            
						res.status(406).json({ message: "Unauthorized" });

					} else {

            const userEmail:string = (decoded as jwt.JwtPayload).email;
						const accessToken = getAccessToken(userEmail);
            
            if ( !accessToken ){
              res.status(404).json({ msg: `User ${userEmail} not found` });
              return;            
            }
            res.cookie( "jwt_access", accessToken, {
              httpOnly: true,
              sameSite: 'lax',
              secure: false,
              maxAge: 10 * 60 * 1000
            })
						const infoPayload = await formatFacultyDetails( await Faculty.findOne({ Email: userEmail }) as IFaculty );
            res.status(200).json({ msg: `Refreshed token for ${userEmail}`, payload: infoPayload});
					}
				}
			);
		} else {
			res.status(406).json({ message: "Unauthorized" });
		}
	} catch (error) {}
};

const InviteFaculty:RequestHandler = async ( req:Request, res:Response ) => {
	const EmailList = req.body.emailList;
	if ( EmailList ){
		EmailList.forEach( async ( Email:string ) => {
			const password = generatePassword(12);
			const salt = await genSalt(10);
			const hashedPassword = await hash(password, salt);
			const newFaculty:IFaculty = new Faculty({				
				Email: Email,
				PasswordHash: hashedPassword,      
				Salt: salt,
			});
			await newFaculty.save()
				.then(async () => {
					const mailOptions:SendMailOptions = {
						sender: "MSU Club Hub",
						to: Email,
						subject: "",
						text: `
						You've been invited to join our app.

      			Temporary Password: ${password}

      			Please log in and change your password immediately.

			      Login here: ${process.env.CLIENT_URL}/SignIn
						`
					}

					await smtpHandler.sendMail(mailOptions);
				})
		});
	}
}

const SetupFacultyAccount: RequestHandler = async (req: Request, res: Response) => {
	try {
		const { Email, firstName, middleName, lastName, password } = req.body;

		const existingUser = await Faculty.findOne({ Email: Email });
		
		if (!existingUser) {
			res.status(404).json({ msg: `Faculty not found` });
			return;
		}

		existingUser.FirstName = firstName;
		existingUser.MiddleName = middleName;
		existingUser.LastName = lastName;
		const salt = await genSalt(10);
		existingUser.Salt = salt
		existingUser.PasswordHash = await hash(password, salt);
		await existingUser.save()
			.then(() => {				
				res.status(200).json({ msg: `Welcome user ${firstName}` })
			})
		
	} catch (error) {
		res.status(500).json({ msg: `Internal Server Error: ${error}` });
	}
};

const controller:FacultyController = { InviteFaculty, SetupFacultyAccount, Refresh, Login };
export default controller;