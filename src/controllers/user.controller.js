import { asyncHanlder } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
const registerUser = asyncHanlder(async (req, res) => {
 
  // get user details from frontend
  const { fullName, username, email, password } = req.body;
  if ([fullName, username, email, password].some((field)=> field?.trim()==="")) {
    throw new ApiError(400, "All fields are required!");
  }
  // Validate Data
  const existtedUser = await User.findOne({
    $or: [{ username }, { email }]
  })
  if (existtedUser) {
    throw new ApiError(409, "Username or Email already exist!");
  }
  // Check for images
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;
  // check for avatar
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required!");
  }
  // upload images to cloudinary, avatar
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar upload failed!");
  }
  // create user object - create entry in db
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
  })
  // check for user creation
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken" // remove password and refresh token field from response
  )

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while creating an user!");
  }
  // return success response
  return res.status(201).json(
    new ApiResponse(200, createdUser, "User created successfully!")
  )
})

export {
  registerUser
}