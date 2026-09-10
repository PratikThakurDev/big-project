import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelVideos = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if(!mongoose.isValidObjectId(channelId)){
    throw new ApiError(400,"Invalid channelId")
  }

  const { limit = 10, page = 1 } = req.query;

  const videosAggregate = Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);

  const videos = await Video.aggregatePaginate(videosAggregate, {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        videos,
        "Successfully fetched all videos from this channel"
      )
    );
});

const getChannelStats = asyncHandler(async (req, res) => {
  const channelId = req.user._id;

  const totalVideos = await Video.countDocuments({
    owner: channelId,
  });

  const totalSubscribers = await Subscription.countDocuments({
    channel: channelId,
  });

  const viewsData = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $group: {
        _id: null, //add all incoming docs in one doc
        totalViews: {
          $sum: "$views",
        },
      },
    },
  ]);

  const channelVideos = await Video.find({
    owner: channelId,
  }).select("_id");

  const videoIds = channelVideos.map((video) => video._id);

  const totalLikes = await Like.countDocuments({
    video: {
      $in: videoIds,
    },
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalVideos,
        totalSubscribers,
        totalViews: viewsData[0]?.totalViews || 0,
        totalLikes,
      },
      "Channel stats fetched successfully"
    )
  );
});

export { getChannelVideos, getChannelStats };
