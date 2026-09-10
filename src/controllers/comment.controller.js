import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import mongoose from "mongoose";

const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const { content } = req.body;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id ");
  }

  if (!content?.trim()) {
    throw new ApiError(400, "Content is required");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const comment = await Comment.create({
    content: content.trim(),
    owner: req.user._id,
    video: videoId,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, comment, "Comment added successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  if (!mongoose.isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid commentId");
  }

  if (!content?.trim()) {
    throw new ApiError(400, "Content is required");
  }

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  if (comment.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this comment");
  }

  comment.content = content.trim();
  await comment.save();

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!mongoose.isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid commentId");
  }

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  if (comment.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this comment");
  }

  await comment.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Comment deleted successfully"));
});

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const { limit = 10, page = 1 } = req.query;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id ");
  }

  const commentAggregate = Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
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

  const comments = await Comment.aggregatePaginate(commentAggregate, {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  });

  return res
    .status(200)
    .json(new ApiResponse(200, comments, "Successfully fetched all comments"));
});

export { addComment, updateComment, deleteComment, getVideoComments };
