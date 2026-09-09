import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Like } from "../models/like.model.js";
import { Video } from "../models/video.model.js";
import { Tweet } from "../models/tweet.model.js";
import { Comment } from "../models/comment.model.js";
import mongoose from "mongoose";

const getLikedVideos = asyncHandler(async (req, res) => {
  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $project: {
        video: 1,
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
    {
      $addFields: {
        video: {
          $first: "$video",
        },
      },
    },
  ]);

  return res
    .status(201)
    .json(
      new ApiResponse(201, likedVideos, "Successfully fetched all liked videos")
    );
});

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const liked = await Like.findOne({
    likedBy: new mongoose.Types.ObjectId(req.user._id),
    video: new mongoose.Types.ObjectId(videoId),
  });

  if (liked) {
    await liked.deleteOne();

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Unliked successfully"));
  } else {
    await Like.create({
      likedBy: new mongoose.Types.ObjectId(req.user._id),
      video: new mongoose.Types.ObjectId(videoId),
    });

    return res
      .status(200)
      .json(new ApiResponse(200, null, "liked successfully"));
  }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!mongoose.isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet id");
  }

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  const liked = await Like.findOne({
    likedBy: new mongoose.Types.ObjectId(req.user._id),
    tweet: new mongoose.Types.ObjectId(tweetId),
  });

  if (liked) {
    await liked.deleteOne();

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Unliked successfully"));
  } else {
    await Like.create({
      likedBy: new mongoose.Types.ObjectId(req.user._id),
      tweet: new mongoose.Types.ObjectId(tweetId),
    });

    return res
      .status(200)
      .json(new ApiResponse(200, null, "liked successfully"));
  }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!mongoose.isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  const liked = await Like.findOne({
    likedBy: new mongoose.Types.ObjectId(req.user._id),
    comment: new mongoose.Types.ObjectId(commentId),
  });

  if (liked) {
    await liked.deleteOne();

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Unliked successfully"));
  } else {
    await Like.create({
      likedBy: new mongoose.Types.ObjectId(req.user._id),
      comment: new mongoose.Types.ObjectId(commentId),
    });

    return res
      .status(200)
      .json(new ApiResponse(200, null, "liked successfully"));
  }
});

export { getLikedVideos, toggleVideoLike, toggleTweetLike, toggleCommentLike };
