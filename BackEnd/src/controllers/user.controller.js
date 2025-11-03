import { UserData } from "../models/user.models.js";
import { getLocationData } from "../utils/Api.js";
import { ApiError } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";


const getUserData = asyncHandler(async(req,res)=>{
    const {address,category,lat,long} = req.body
    console.log(address)
    if(!category){
        throw new ApiError(400,"Category is Required!");
    }
    if (Number.isNaN(lat) || Number.isNaN(long)) {
        throw new ApiError(400,"Latitude and Longitude must be a number!");
    }
    if (lat < -90 || lat > 90 || long < -180 || long > 180) {
        throw new ApiError(400,"latitude or longitude out of range!");
    }
    const location = {type: 'point', coordinates:[lat,long]};

    //hit api and get other data that needs to be stored;
    const locationData = await getLocationData(lat,long);


    const doc = await UserData.create({
        address,
        category,
        location,
        place_rank: locationData.place_rank,
        importance: locationData.importance
    })

    return res.status(200)
    .json(new ApiResponse(200,{doc},"User data updated Successfully"))
})

export {getUserData};