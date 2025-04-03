import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import cookieparser from 'cookie-parser';
import cors, { CorsOptions } from 'cors';
import userRouter from './routes/user-routes';
import clubRouter from './routes/club-routes';

dotenv.config();

const app = express();
const port = process.env.PORT;

app.use(express.json());
const options:CorsOptions = {  
  origin:[`${process.env.BASE_URL}:${process.env.CLIENT_PORT}`],
  credentials: true
}
app.use(cors(options));
app.use(cookieparser())

app.get('/api/test', (req:Request, res:Response) => {  
  res.send('Hello, This is the API for MSUClubHub');
});

app.use("/api", userRouter);
app.use("/api/Clubs", clubRouter);

// Connect to MongoDB
// @ts-ignore
mongoose.connect(process.env.DB_URL, {
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('Error connecting to MongoDB', err);
});

app.listen(port, () => {
  console.log(`Server is running on ${process.env.BASE_URL}:${port}`);
});