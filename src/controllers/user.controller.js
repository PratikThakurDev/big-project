import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  // validate  - not empty
  // check if user already exists
  // check for images , check for avatar
  // upload them to cloudinary , avatar
  //create user object - creae entry in db
  // remove password and refresh token from output
  // check for user creation
  // return response

  const { username, email, fullName, password } = req.body;
  console.log("email: ", email);

  if (
    [username, email, password, fullName].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All field are required");
  }

  const existedUser = User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;

  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar required");
  }

  const user = await User.create({
    fullName,
    email,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while creating user ");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "created user successfully"));
});

export { registerUser };
