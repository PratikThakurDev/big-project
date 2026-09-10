import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Tweet } from "../models/tweet.model.js";
import { Like } from "../models/like.model.js";
import mongoose from "mongoose";

const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (!content?.trim()) {
    throw new ApiError(400, "Content is required");
  }

  const tweet = await Tweet.create({
    content,
    owner: req.user._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, tweet, "Tweet created successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid userId");
  }

  const tweets = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
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
    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);
  return res
    .status(200)
    .json(new ApiResponse(200, tweets, "User tweets fetched successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { content } = req.body;

  if (!mongoose.isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweetId");
  }

  if (!content?.trim()) {
    throw new ApiError(400, "Content is required");
  }

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  if (tweet.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this tweet");
  }

  tweet.content = content.trim();
  await tweet.save();

  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  if (!mongoose.isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweetId");
  }

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  if (tweet.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this tweet");
  }

  await tweet.deleteOne();

  await Like.deleteMany({ tweet: tweetId });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Tweet deleted successfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
