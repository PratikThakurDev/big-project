import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.model.js";
import mongoose from "mongoose";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name?.trim() || !description?.trim()) {
    throw new ApiError(400, "All fields are required ");
  }

  const playlist = await Playlist.create({
    name: name.trim(),
    description: description.trim(),
    owner: req.user._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, playlist, "Playlist created successfully "));
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!mongoose.isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist id");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, " Playlist not found ");
  }

  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this playlist");
  }

  await playlist.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Playlist deleted successfully "));
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!mongoose.isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist id");
  }

  const playlist = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
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
  ]);

  if (!playlist.length) {
    throw new ApiError(404, " Playlist not found ");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlist[0], "Successfully fetched the playlist")
    );
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  const { name, description } = req.body;

  if (!name?.trim() && !description?.trim()) {
    throw new ApiError(400, "Atleast one field is required ");
  }

  if (!mongoose.isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist id");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, " Playlist not found ");
  }

  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this playlist");
  }

  if (name) {
    playlist.name = name.trim();
  }

  if (description) {
    playlist.description = description.trim();
  }

  await playlist.save();

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Successfully updated the playlist "));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user id");
  }

  const playlists = await Playlist.find({
    owner: new mongoose.Types.ObjectId(userId),
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        playlists,
        "Successfully fectched all playlists of the user"
      )
    );
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { videoId, playlistId } = req.params;

  if (!mongoose.isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist id");
  }

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to modify this playlist");
  }

  const alreadyAdded = playlist.videos.some((id) => id.toString() === videoId);

  if (alreadyAdded) {
    throw new ApiError(400, "Video already exists in playlist");
  }

  playlist.videos.push(videoId);

  await playlist.save();

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlist, "Video successfully added to the playlist")
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { videoId, playlistId } = req.params;

  if (!mongoose.isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist id");
  }

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to modify this playlist");
  }

  const videoExists = playlist.videos.some((id) => id.toString() === videoId);

  if (!videoExists) {
    throw new ApiError(404, "Video not found in playlist");
  }

  playlist.videos = playlist.videos.filter((id) => id.toString() !== videoId);

  await playlist.save();

  return res
    .status(200)
    .json(
      new ApiResponse(200, null, "Vidoe removed from playlist successfully")
    );
});

export {
  createPlaylist,
  deletePlaylist,
  getPlaylistById,
  updatePlaylist,
  getUserPlaylists,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
};
