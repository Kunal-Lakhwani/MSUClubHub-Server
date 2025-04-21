import express, { Request, Response, RequestHandler } from 'express';
interface FlairController {
  CreateFlairs:RequestHandler,
  EditFlair:RequestHandler,
}

const CreateFlairs:RequestHandler = async ( req:Request, res:Response ) => {
  const { clubID, flairArr } = req.body;
  
}


const EditFlair:RequestHandler = async ( req:Request, res:Response ) => {

}


export const controller:FlairController = { CreateFlairs, EditFlair }