import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/like.model.js";
import { Playlist } from "../models/playlist.model.js";
import mongoose from "mongoose";

const getAllVideos = asyncHandler(async (req, res) => {
  // get all things from the req.query object
  // validate the query parameters
  // if query is empty, return all the videos
  // if query is not empty, filter the videos based on the query parameter
  // sort the videos based on the query parameter (if sortBy and sortType are provided else return the videos in the default order)
  // paginate the videos based on the query parameter (if page and limit are provided else return the videos in the default pagination)
  // return the videos in the response
  const {
    page = 1,
    limit = 10,
    query,
    sortBy = "createdAt",
    sortType = "desc",
  } = req.query;

  matchStage.owner = new mongoose.Types.ObjectId(req.user._id);

  const matchStage = {};
  if (query) {
    matchStage.$or = [
      {
        title: {
          $regex: query,
          $options: "i",
        },
      },
      {
        description: {
          $regex: query,
          $options: "i",
        },
      },
    ];
  }

  const videoAggregate = Video.aggregate([
    {
      $match: matchStage,
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
        [sortBy]: sortType === "asc" ? 1 : -1,
      },
    },
  ]);

  const videos = await Video.aggregatePaginate(videoAggregate, {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  });

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Videos fetched successfully"));
});

const publishVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    throw new ApiError(400, "Title and description are required");
  }

  const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (!videoFileLocalPath || !thumbnailLocalPath) {
    throw new ApiError(400, "Video file and thumbnail are required");
  }

  const videoFile = await uploadOnCloudinary(videoFileLocalPath);

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!videoFile || !thumbnail) {
    throw new ApiError(500, "Failed to upload video or thumbnail");
  }

  const video = await Video.create({
    videoFile: { url: videoFile.url, public_id: videoFile.public_id },
    thumbnail: { url: thumbnail.url, public_id: thumbnail.public_id },
    title,
    description,
    duration: videoFile.duration,
    owner: req.user._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, video, "Video published successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }
  const videoExists = await Video.findById(videoId);

  if (!videoExists) {
    throw new ApiError(404, "Video not found");
  }

  await Video.findByIdAndUpdate(videoId, {
    $inc: {
      views: 1,
    },
  });

  await User.findByIdAndUpdate(req.user._id, {
    $addToSet: {
      watchHistory: videoId,
    },
  });

  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
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
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, video[0], "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;

  const thumbnail = req.file;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  if (!title && !description && !thumbnail) {
    throw new ApiError(
      400,
      "At least one of title, description or thumbnail is required"
    );
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this video");
  }

  const fieldsToUpdate = {};

  if (title) {
    fieldsToUpdate.title = title;
  }

  if (description) {
    fieldsToUpdate.description = description;
  }

  let oldThumbnailPublicId;

  if (thumbnail) {
    const thumbnailLocalPath = thumbnail.path;
    const uploadedThumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!uploadedThumbnail) {
      throw new ApiError(500, "Failed to upload thumbnail");
    }

    fieldsToUpdate.thumbnail = {
      url: uploadedThumbnail.secure_url,
      public_id: uploadedThumbnail.public_id,
    };

    oldThumbnailPublicId = video.thumbnail?.public_id;
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: fieldsToUpdate,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (oldThumbnailPublicId) {
    await deleteFromCloudinary(oldThumbnailPublicId);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "videoId is required");
  }

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this video");
  }

  await deleteFromCloudinary(video.videoFile.public_id);
  await deleteFromCloudinary(video.thumbnail.public_id);

  await video.deleteOne();

  await Like.deleteMany({ video: videoId });
  await Comment.deleteMany({ video: videoId });
  await Playlist.updateMany(
    {
      videos: videoId,
    },
    {
      $pull: {
        videos: videoId,
      },
    }
  );

  await User.updateMany(
    {
      watchHistory: videoId,
    },
    {
      $pull: {
        watchHistory: videoId,
      },
    }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "videoId is required");
  }

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this video");
  }

  video.isPublished = !video.isPublished;
  await video.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        video,
        `Video ${video.isPublished ? "published" : "unpublished"} successfully`
      )
    );
});

export {
  getAllVideos,
  publishVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
