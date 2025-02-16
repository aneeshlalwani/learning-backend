import { asyncHanlder } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

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
  if (!email || !username) {
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

export {
  registerUser,
  loginUser,
  logoutUser
}