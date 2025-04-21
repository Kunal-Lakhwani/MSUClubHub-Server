// import { Request, Response, NextFunction } from 'express';
// import * as jwt from 'jsonwebtoken'

// export function refreshTokenMiddleware(req: Request, res: Response, next: NextFunction) {
//   try {
//     const accessToken = req.cookies.jwt_access;
//     if ( accessToken ){
//       const userInfo = jwt.verify( accessToken, process.env.JWT_ACCESS_SECRET as string ) as jwt.JwtPayload;      
//       // If token will expire in 10 minutes, refresh it
//       if ( userInfo.exp! * 1000 < Date.now() + 36000 ){
//         const refreshedUserInfo = {
//           ID:
//         }
//         res.cookie()
//       }
//     }
//   } catch (error) {
    
//   }
//   next();
// }
