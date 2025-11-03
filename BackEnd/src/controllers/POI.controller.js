import { lower_range, max_competitors, max_count_complementary, max_distance, max_pop_density, min_competitors, min_pop_density, upper_range } from "../constant.js";
import { competitionDensity, getComplementary, nearestNodalPointORS, populationDensity } from "../utils/Api.js";
import { ApiError } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";



const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

const calculate_score = asyncHandler(async(req,res)=>{
    const {lat,long,radius,category} = req.body;
    if (lat === undefined || long === undefined) {
    throw new ApiError(400, "lat and long are required in request body");
    }
    const plat = parseFloat(lat);
    const plong = parseFloat(long);
    const pradius = Number(radius);

    if (Number.isNaN(plat) || Number.isNaN(plong) || Number.isNaN(pradius)) {
        throw new ApiError(400, "lat, long and radius must be numeric");
    }
    const geotiffPath = "C:/Users/ar616f/Desktop/demo/POI/pointsofinterest_poc/BackEnd/public/ppp_2020.tif";
    const [
    pop_density_raw,
    competitors_raw,
    distance_raw,
    complementary_raw,
    ] = await Promise.all([
    populationDensity(geotiffPath, plat, plong),
    competitionDensity(plat, plong, pradius, category),
    nearestNodalPointORS(plat, plong),
    getComplementary(plat, plong, pradius, category),
    ]);

    console.log("complementary_raw",complementary_raw)

    // Convert to numbers safely
    const pop_density = Number(pop_density_raw) || 0;
    const competitors = competitors_raw.count;
    const distance = Number(distance_raw);
    const complementary = complementary_raw.count || 0;

    console.log("pop_density",pop_density)
    console.log("competitors",competitors)
    console.log("distance",distance)
    console.log("complementary",complementary)

    const population_density_norm = Math.min(1,(pop_density-min_pop_density)/(max_pop_density-min_pop_density));
    const competition_density_norm = Math.min(1,(competitors-min_competitors)/(max_competitors - min_competitors));
    const accessibility_score = clamp(0, Math.min(1, 1-(distance/max_distance)))
    const complementary_business_score = Math.min(1,complementary/max_count_complementary)

    const score = (0.4 * population_density_norm)
        - (0.3 * competition_density_norm)
        + (0.2 * accessibility_score)
        + (0.1 * complementary_business_score)

    let result;
    if(score>=upper_range) result = "Highly Suitable"
    else if(score<upper_range && score>=lower_range) result = "Moderate"
    else result = "Not Suitable"
    
    return res.status(200)
    .json(new ApiResponse(200,{result,score},"Score Calculated Successfully"))
})

export {calculate_score};