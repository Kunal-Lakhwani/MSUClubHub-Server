import express, { Request, Response, RequestHandler } from 'express';
import multer from "multer";
import fs from "fs";
import { ImageDirectories } from "../models/Utils";
import path from "path";
import { CommunityPost, ICommunityPost } from '../models/communitypost';
import { Member } from '../models/members';
import { IPostComment, PostComment } from '../models/comment';
import * as jwt from 'jsonwebtoken';
import { User } from '../models/user';
import { Club, IClub } from '../models/club';

// fileIndex set to 1 for every request.
let fileIdx = 1;

const SanitizeString = ( str:string ) => {
  return str.trim().replace(/\s+/g, '_').replace(/[^\w\-]/g, '').replace(/_+/g, '_');
}

const storage = multer.diskStorage({
  destination: function (req:Request, file:Express.Multer.File, saveLocation:Function){
    
    let uploadPath = path.join( process.cwd(), "public", "Images", ImageDirectories.PostImage)
    // Ensure the directory exists; if not, create it
    fs.mkdir(uploadPath, { recursive: true }, (err) => {
      if (err) {
        console.error('Error creating directory:', err);
        saveLocation(err, uploadPath);
      } else {
        saveLocation( null, uploadPath )
      }
    });
  },
  filename: function ( req:Request, file:Express.Multer.File, callback:Function ){

    let fileName = `${SanitizeString(req.body.title)}_${Date.now()}`;
    fileName += "_" + (fileIdx < 10 ? "0" : "") + fileIdx++;
    const fileMime = file.mimetype.split("/");
    fileName += "." + fileMime[fileMime.length - 1];
    try {
      callback(null, fileName)
    } catch (error) {
      // @ts-ignore
      callback({ msg: error.message });
    }
  }
});

const fileFilter = (req:Request, file:Express.Multer.File, cb:Function) => {
  if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file format"), false);
  }
};

export const upload = multer({ storage, fileFilter });

interface CommunityBoardController {
  CreatePost:RequestHandler,
  FetchNews:RequestHandler,
  FetchPosts:RequestHandler,
  FetchFullPost:RequestHandler,
  LikePost:RequestHandler,
  UnLikePost:RequestHandler,
  EditPost:RequestHandler,
  AddComment:RequestHandler,
  FetchCommentTree:RequestHandler,
  LikeComment:RequestHandler,
  UnLikeComment:RequestHandler,
  DeletePost:RequestHandler,
  DeleteComment:RequestHandler
}

const CreatePost:RequestHandler = async ( req:Request, res:Response ) => {

  try {

    const { memberID, clubID, type, title, body } = req.body;
    const files = req.files as Record<string, Express.Multer.File[]>;
    const randomSuffix = (Date.now() + Math.random()).toString(36).replace(/[^a-z0-9]/gi, '').substring(0, 7);
    const url = `${SanitizeString( title as string )}-${randomSuffix}`;
    const newPost = new CommunityPost({
      Club: clubID,
      Author: memberID,
      PostURI: url,
      Type: type,
      Title: title,
      isDeleted: false,
    });
    if ( body ){
      newPost.Body = body;
    }
    if ( files['images'] ){
      newPost.Images = files['images'].map( file => file.filename );
    }
    await newPost.save();    
    res.status(200).json({ msg: `Post created`, postURL: url })
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: error })
  }
}

const formatPost = ( post:ICommunityPost, CommentCount: number, currentUser: string ) => {
  return {
    ID: post._id,
    Author: post.Author,
    Club: post.Club,
    PostURL: post.PostURI,
    Title: post.Title,
    Body: post.Body,      
    Type: post.Type,
    Flair: post.Flair,
    Images: post.Images?.map( img => `${process.env.SERVER_URL}/Images/${ImageDirectories.PostImage}/${img}` ),
    Likes: post.LikedBy.length,
    CommentCount: CommentCount,
    PostedOn: post.createdAt, 
    IsLiked: post.LikedBy.find( likeInfo => likeInfo.User.toString() === currentUser ) ? true : false,
    IsDeleted: post.isDeleted,
  }
}

const fetchClubPosts = async ( clubID:string, type:string, before:Date = new Date(), userID:string, memberID:string = "" ) => {
  const queryOptions:any = { 
    Club: clubID, Type: type, isDeleted: false, createdAt: { $lt: before }
  }
  if ( memberID !== "" ){
    queryOptions.Author = memberID
  }
  const Posts = await CommunityPost.find(queryOptions).sort({ createdAt: -1 }).populate("Author Flair Club").limit(5).lean();
  const formattedPosts = await Promise.all( Posts.map( async post => {
    const CommentCount = await PostComment.countDocuments({ Post: post._id });
    return formatPost( post, CommentCount, userID );
  }))
  return formattedPosts.length > 0 ? formattedPosts : [];
}

const FetchNews:RequestHandler = async ( req:Request, res:Response ) => {
  try {
    const { clubID, userID, lstFetchedDate } = req.body;
    const formattedPosts = await fetchClubPosts( clubID, "News", new Date(lstFetchedDate), userID );
    res.status(200).json(formattedPosts);
  } catch (error) {
    console.log(error);
    res.status(500).json({msg: error});
  }
}

const FetchPosts:RequestHandler = async ( req:Request, res:Response ) => {
  try {
    const { clubID, lstFetchedDate, userID } = req.body;
    const isPartOfClub = (await Member.find({ Club: clubID, User: userID})).length > 0;
    if ( isPartOfClub ){      
      const formattedPosts = await fetchClubPosts( clubID, "Post", new Date(lstFetchedDate), userID );
      res.status(200).json(formattedPosts);
    }
    else{
      res.status(406).json({ msg: `User is not part of club` });
    }
  } catch (error) {
    res.status(500).json({msg: error});
  }
}

const DeletePost:RequestHandler = async ( req:Request, res:Response ) => {
  try {
    const { postURI } = req.params;
    const PostInfo = await CommunityPost.findOne({ PostURI: postURI });
    if ( !PostInfo ){
      res.status(404).json({ msg: "Post not found" });
      res.end();
      return;            
    }    
    const userInfoCookie = req.cookies.jwt_access;
    const userInfo = jwt.verify( userInfoCookie, process.env.JWT_ACCESS_SECRET as string ) as jwt.JwtPayload;
    const clubInfo = await Club.findById( PostInfo.Club );
    if ( 
      userInfo.role === "Faculty" || userInfo.role === "Admin" ||
      PostInfo.Author.toString() === userInfo.club.MemberID || 
      clubInfo?.Moderators.includes(userInfo.ID) 
    ){
      PostInfo.isDeleted = true;
      if ( PostInfo.Images && PostInfo.Images.length > 0 ){
        PostInfo.Images.forEach( img => {

          const prevPath = path.join( process.cwd(), "public", "Images", ImageDirectories.PostImage, img)
  
          fs.unlink(prevPath, err => {
            console.log(err);
          });
        })
      }
      await PostInfo.save();
      res.status(200).json({msg: "Deleted post"});
    }
    else{
      res.status(406).json({ msg: "Invalid Permissions" });
      res.end();
      return;
    }
  } catch (error) {
    console.log(error);
  }
}

const FetchFullPost:RequestHandler = async ( req:Request, res:Response ) => {
  try {
    const { postURI, userID } = req.params;
    const requestedPost = await CommunityPost.findOne({ PostURI: postURI, isDeleted: false }).populate("Author Flair");

    if ( requestedPost ){            
      const CommentCount = await PostComment.countDocuments({ Post: requestedPost._id });
      const formattedPost = formatPost( requestedPost, CommentCount, userID );
      res.status(200).json(formattedPost);
    }
    else{
      res.status(404).json({ msg: `No such post exists` });
    }
  } catch (error) {
    res.status(500).json({msg: error});
  }
}

const LikePost:RequestHandler = async ( req:Request, res:Response ) => {
  try {
    const { postID, userID } = req.params;
    const LikedPost = await CommunityPost.findById( postID );
    const UserInfo = await User.findById( userID );
    if ( !UserInfo ){
      res.status(400).json({ msg: `User does not exist` });
    }
    else if ( !LikedPost || LikedPost.isDeleted ){
      res.status(400).json({ msg: `Post does not exist` });
    }
    else{
      if ( LikedPost.Type === "Post" ){
        const isMember = (await Member.findOne( { Club: LikedPost.Club, User: userID } )) !== null;
        if ( !isMember ){
          res.status(406).json({ msg: `You need to be a member to like this post` });
          res.end();
          return;
        }
      }
      const updatedPost = await CommunityPost.findByIdAndUpdate( postID, { 
        $push: { LikedBy: { User: userID } }
      }, { new: true });      
      res.status(200).json({ LikesCount: updatedPost?.LikedBy.length });
    }
  } catch (error) {
    res.status(500).json({msg: "Internal server error", error: error})
  }
}

const UnLikePost:RequestHandler = async ( req:Request, res:Response ) => {
  try {
    const { postID, userID } = req.params;
    const LikedPost = await CommunityPost.findById( postID );
    const UserInfo = await User.findById( userID );
    if ( !UserInfo ){
      res.status(400).json({ msg: `User does not exist` });
    }
    else if ( !LikedPost ){
      res.status(400).json({ msg: `Post does not exist` });
    }
    else if ( !LikedPost.LikedBy.find( likeInfo => likeInfo.User.toString() === userID ) ) {
      res.status(400).json({ msg: `You have not given this post a like` });      
    }
    else{
      const updatedPost = await CommunityPost.findByIdAndUpdate( postID, { 
        $pull: { LikedBy: { User: userID } }
      }, { new: true });      
      res.status(200).json({ LikesCount: updatedPost?.LikedBy.length });
    }
  } catch (error) {
    res.status(500).json({msg: "Internal server error", error: error})
  }
}

const LikeComment:RequestHandler = async ( req:Request, res:Response ) => {
  try {
    const { commentID, userID } = req.params;
    const CommentInfo = await PostComment.findById( commentID );
    const UserInfo = await User.findById( userID );
    if ( !UserInfo ){
      res.status(400).json({ msg: `User does not exist` });
    }
    else if ( !CommentInfo ){
      res.status(400).json({ msg: `Comment does not exist` });
    }
    else{
      const isMember = (await Member.findOne( { Club: CommentInfo.Club, User: userID } )) !== null;
      if ( !isMember ){
        res.status(406).json({ msg: `You need to be a member to like this comment` });
        res.end();
        return;
      }
      if ( CommentInfo.LikedBy.find( likedInfo => likedInfo.User.toString() === userID ) ){
        res.status(400).json({ msg: `You have already given this comment a like` });
      }
      const updatedPost = await PostComment.findByIdAndUpdate( commentID, { 
        $push: { LikedBy: { User: userID } }
      }, { new: true });      
      res.status(200).json({ LikesCount: updatedPost?.LikedBy.length });
    }
  } catch (error) {
    
  }
}

const UnLikeComment:RequestHandler = async ( req:Request, res:Response ) => {
  try {
    const { commentID, userID } = req.params;
    const CommentInfo = await PostComment.findById( commentID );
    const UserInfo = await User.findById( userID );
    if ( !UserInfo ){
      res.status(400).json({ msg: `User does not exist` });
    }
    else if ( !CommentInfo ){
      res.status(400).json({ msg: `Comment does not exist` });
    }
    else{      
      if ( !CommentInfo.LikedBy.find( likedInfo => likedInfo.User.toString() === userID ) ){
        res.status(400).json({ msg: `You have not given this comment a like` });
      }
      const updatedPost = await PostComment.findByIdAndUpdate( commentID, { 
        $pull: { LikedBy: { User: userID } }
      }, { new: true });      
      res.status(200).json({ LikesCount: updatedPost?.LikedBy.length });
    }
  } catch (error) {
    
  }
}


const AddComment:RequestHandler = async ( req:Request, res:Response ) => {
  try {
    const { postID } = req.params;
    const { memberID, replyingTo, commentBody } = req.body;
    const PostExists = await CommunityPost.findById( postID );
    if ( !PostExists ){
      res.status(400).json({ msg: `Post does not exist` });
      res.end();
      return;
    }
    const MemberInfo = await Member.findById( memberID );
    if ( MemberInfo === null ){
      res.status(406).json({ msg: `You need to be a member to comment on this post` });
      res.end();
      return;
    }
    const newComment = new PostComment({ 
      Club: MemberInfo.Club,
      Author: memberID,
      Post: postID,
      Body: commentBody,
      isTopLevel: true,
    })    
    if ( replyingTo ){
      await PostComment.findByIdAndUpdate( replyingTo , { $push: { Replies: newComment._id } });
      newComment.isTopLevel = false;
    }    
    await newComment.save();
    res.status(200).json({ 
      msg: "Your comment was added", 
      newComment: {
        _id: newComment._id,
        Club: newComment.Club,
        Author: MemberInfo,
        Post: postID,
        Replies: [],
        Body: commentBody,
        isTopLevel: newComment.isTopLevel,
        LikedBy: [],
        createdAt: newComment.createdAt,
      }
    });
  } catch (error) {
    
  }
}

const DeleteComment:RequestHandler = async ( req:Request, res:Response ) => {
  const { commentID } = req.params;

  try {
    const CommentInfo = await PostComment.findOne({ _id: commentID })    
    if ( !CommentInfo ){
      res.status(404).json({ msg: "No such comment exists" });
      res.end();
      return;
    }
    const userInfoCookie = req.cookies.jwt_access;
    const userInfo = jwt.verify( userInfoCookie, process.env.JWT_ACCESS_SECRET as string ) as jwt.JwtPayload;
    const clubInfo = await Club.findById( CommentInfo.Club );
    if ( 
      userInfo.role === "Faculty" || userInfo.role === "Admin" ||
      CommentInfo.Author.toString() === userInfo.club.MemberID || 
      clubInfo?.Moderators.includes(userInfo.ID) 
    ){
      CommentInfo.isDeleted = true;      
      await CommentInfo.save();
      res.status(200).json({msg: "Deleted post"});
    }
    else{
      res.status(404).json({ msg: "Invalid Permissions" });
    }
  } catch (error) {
    res.status(500).json({ msg: "Server Error" })
  }
}

const FetchCommentTree: RequestHandler = async (req, res) => {
  const { postID } = req.params;  
  const { userID, parentID, lastFetchDate } = req.body;
  try {
    const populateTree = {
      path: "Replies",
      populate: [
        { path: "Author" },
        {
          path: "Replies",
          populate: [
            { path: "Author" },
            {
              path: "Replies",
              populate: [
                { path: "Author" },
              ]
            }
          ]
        }
      ]
    }
    if ( parentID ){ 
      const retVal = await PostComment.findById(parentID)
          .populate("Author")
          .populate(populateTree);
      res.status(200).json(retVal?.Replies);
    }else { 
      const retVal = await PostComment.find(
            { Post: postID, createdAt: { $lt: new Date(lastFetchDate)}, isTopLevel: true}
          )
          .populate("Author")
          .populate(populateTree).limit(10);
      res.status(200).json(retVal);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

const EditPost:RequestHandler = async ( req:Request, res:Response ) => {

}


const controller:CommunityBoardController = { 
  CreatePost, EditPost, FetchNews, FetchPosts, FetchFullPost, LikePost, UnLikePost, FetchCommentTree,
  AddComment, LikeComment, UnLikeComment, DeletePost, DeleteComment
}
export default controller;