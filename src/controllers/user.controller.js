import { asyncHanlder } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })
    
    return { accessToken, refreshToken }
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating access and refresh token!");
  }
}
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
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }
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

// Controller to login user
const loginUser = asyncHanlder(async (req, res) => {
  // get user credentials
  const { email, username, password } = req.body;
  // check for user credentials
  if (!email && !username) { 
    throw new ApiError(400, "Email and Username are required!");
  }
  // check for user existence
  const user = await User.findOne({
    $or: [{ email }, { username }]
  })
  if (!user) {
    throw new ApiError(401, "Invalid email or password!");
  }
  // check for password
  const isValidPassword = await user.isPasswordCorrect(password);
  if (!isValidPassword) {
    throw new ApiError(401, "Invalid email or password!");
  }
  // generate token
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
  // Send cookies
  const options = ({
    httpOnly: true,
    secure: true
  })

  return res
    .status(200)
    .cookie("accessToken", accessToken.options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(200, {
        user: loggedInUser, accessToken, refreshToken
      },
        "User logged in successfully"
      )
    )
})

const logoutUser = asyncHanlder(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined
      }
    },
    {
      new: true
    }
  )
  const options = {
    httpOnly: true,
    secure: true,
  }

  return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(200, {}, "User loggedout");
})

const refreshAccessToken = asyncHanlder(async (req, res) => {
  const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unathuarized access")
  }

  try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "User not found")
    }
    
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "refresh Token is expired or used!");
    }
  
    const options = {
      httpOnly: true,
      secure: true,
    }
  
    const {accessToken, newRefreshToken } = await generateAccessAndRefreshToken(user._id);
  
    return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(
      new ApiResponse(200, {
        accessToken, refreshToken: newRefreshToken
      },
      "Access Token Refreshed")
    )
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
})

const changeCurrentPassword = asyncHanlder(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect =  await user.isPasswordCorrect(oldPassword)

  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid old password")
  }
  user.password = newPassword;
  await user.save({
    validateBeforeSave: false
  });

  return res.json(
    new ApiResponse(200, {}, "password changed successfully!")
  )
})

const getCurrentUser = asyncHanlder(async (req, res) => {
  return res.json(new ApiResponse(200, req.user, "Current user fetched successfully!"))
})

const updateAccountDetails = asyncHanlder(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(400, "Please provide both full name and email")
  }
  const user = await User.findByIdAndUpdate(req.user?._id, {
    $set: {
      fullName,
      email
    }
  }, {
    new: true
  }
  ).select("-password")

  return res.status(200).json(
    new ApiResponse(200, "Account details updated successfully")
  )
})

const updateUserAvatar = asyncHanlder(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "File path missing")
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath)

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading profle!")
  }

  const user = await User.findByIdAndUpdate(req.user?._id, {
    $set: {
      avatar: avatar.url
    }
  }, {
    new: true
  }).select("-password")

  return res.status(200).json(
    new ApiResponse(200, user, "Profile image updated!")
  )
})

const updateUserCoverImage = asyncHanlder(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image File path missing")
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading cover image!")
  }

  const user = await User.findByIdAndUpdate(req.user?._id, {
    $set: {
      coverImage: coverImage.url
    }
  }, {
    new: true
  }).select("-password")

  return res.status(200).json(
    new ApiResponse(200, user, "Cover image updated!")
  )
})

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage
}