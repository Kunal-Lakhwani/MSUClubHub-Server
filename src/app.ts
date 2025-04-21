import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import cookieparser from 'cookie-parser';
import cors, { CorsOptions } from 'cors';
import userRouter from './routes/user-routes';
import clubRouter from './routes/club-routes';
import facultyRouter from './routes/faculty-routes';
import path from 'path';
import { ImageDirectories } from './models/Utils';
import { Settings } from './models/settings';
import communityBoardRouter from './routes/community-board-routes';

dotenv.config();

const app = express();

app.use(express.json());
const options:CorsOptions = {  
  origin:[`${process.env.CLIENT_URL}`],
  credentials: true
}
app.use(cors(options));
app.use(cookieparser());

// To serve Images for frontend.
app.use("/Images", express.static(path.join( process.cwd(), "public", "Images")))

app.use("/api/User", userRouter);
app.use("/api/Faculty", facultyRouter);
app.use("/api/Clubs", clubRouter);
app.use("/api/Community", communityBoardRouter);

// Connect to MongoDB
mongoose.connect(process.env.DB_URL as string, {  
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('Error connecting to MongoDB', err, "\n Trying Fallback Connection string");
  mongoose.connect( process.env.FALLBACK_DB_URL as string,{
  }).then(() => {
    console.log('Connected to MongoDB')
  }).catch( err => {
    console.error('Error connecting to MongoDB', err);
    process.exit(1);
  })
});

// Initialize settings collection entry if it does not exist
const InitSettings = async () => {
  if ( await Settings.countDocuments({}) < 1 ){
    await Settings.insertOne({});
  }
}

InitSettings();

app.listen(process.env.PORT, () => {
  console.log(`Server is running on ${process.env.SERVER_URL}`);
});