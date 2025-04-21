import express from "express";
import controller, { upload } from "../controllers/community-board-controller";

const communityBoardRouter = express.Router();

communityBoardRouter.post("/:clubName/Forums", controller.FetchPosts);
communityBoardRouter.post("/:clubName/News", controller.FetchNews);

communityBoardRouter.post("/Comments/:postID", controller.FetchCommentTree);
communityBoardRouter.post("/Comments/:postID/AddComment", controller.AddComment);
communityBoardRouter.get("/Comments/:commentID/AddLikeFor/:userID", controller.LikeComment);
communityBoardRouter.get("/Comments/:commentID/RemoveLikeFor/:userID", controller.UnLikeComment);
communityBoardRouter.delete("/Comments/:commentID", controller.DeleteComment);

communityBoardRouter.get("/Post/:postURI/For/:userID", controller.FetchFullPost);
communityBoardRouter.get("/Post/:postID/AddLikeFor/:userID", controller.LikePost);
communityBoardRouter.get("/Post/:postID/RemoveLikeFor/:userID", controller.UnLikePost);
communityBoardRouter.delete("/Post/:postURI", controller.DeletePost);

communityBoardRouter.post( "/CreatePost", upload.fields(
    [
      { name:"images", maxCount:10 }
    ]
), controller.CreatePost);

communityBoardRouter.post( "/EditPost", upload.fields(
  [
    { name:"images", maxCount:10 }    
  ]
), controller.EditPost);


export default communityBoardRouter;