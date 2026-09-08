import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Subscription } from "../models/subscription.model.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";

const toggleSubscription = asyncHandler(async (req, res) => {
  // get channelId from req.params
  // get userId from req.user
  // validate channelId and userId
  // check if that channelId exists in the User collection
  // match userId in the subscriber and then match channelId in the channels
  // if found then delete that document and return a success message
  // if not found then create a new document and return a success message

  const { channelId } = req.params;

  if (!mongoose.isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channelId");
  }

  const channel = await User.findById(channelId);

  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }

  const subscription = await Subscription.findOne({
    subscriber: new mongoose.Types.ObjectId(req.user._id),
    channel: new mongoose.Types.ObjectId(channelId),
  });

  if (subscription) {
    // User is subscribed, so unsubscribe
    await subscription.deleteOne();
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Unsubscribed successfully"));
  } else {
    // User is not subscribed, so subscribe
    await Subscription.create({
      subscriber: new mongoose.Types.ObjectId(req.user._id),
      channel: new mongoose.Types.ObjectId(channelId),
    });
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Subscribed successfully"));
  }
});

const getChannelSubscribers = asyncHandler(async (req, res) => {
  // get channelId from req.params
  // get userId from req.user
  // validate channelId and userId
  // check if that channelId exists in the User collection
  // match channelId in the channel
  // return the list of subscribers for that channelId

  const { channelId } = req.params;

  if (!mongoose.isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channelId");
  }

  const channel = await User.findById(channelId);

  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }

  const subscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriberDetails",
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
        subscriberDetails: {
          $first: "$subscriberDetails",
        },
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribers,
        "Channel subscribers fetched successfully"
      )
    );
});

const getSubscribedChannels = asyncHandler(async (req, res) => {
      // get subsriberId from req.params
  // get userId from req.user
  // validate subscriberId and userId
  // check if that subscriberId exists in the User collection
  // match subscriberId in the subscriber
  // return the list of channels for that subscriberId

    const { subscriberId } = req.params;

  if (!mongoose.isValidObjectId(subscriberId)) {
    throw new ApiError(400, "Invalid subscriberId");
  }

  const subscriber = await User.findById(subscriberId);

  if (!subscriber) {
    throw new ApiError(404, "Subscriber not found");
  }

  const channels = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channelDetails",
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
        channelDetails: {
          $first: "$channelDetails",
        },
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        channels,
        "Subscribed channels fetched successfully"
      )
    );
});

export { toggleSubscription, getChannelSubscribers, getSubscribedChannels };
