import { lower_range, max_competitors, max_count_complementary, max_distance, max_pop_density, min_competitors, min_pop_density, upper_range } from "../constant.js";
import { competitionDensity, getComplementary, nearestNodalPointORS, populationDensity } from "../utils/Api.js";
import { ApiError } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";


//to clamp the value between 0 and 1
function clampVal(v, min = 0, max = 1) {
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

function safeNormalize(value, min, max) {
  const v = Number(value);
  const lo = Number(min);
  const hi = Number(max);
  if (!Number.isFinite(v)) return 0;
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi === lo) {
    return v <= lo ? 0 : 1;
  }
  return clampVal((v - lo) / (hi - lo), 0, 1);
}

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
    const complementary_raw_debug = await getComplementary(plat, plong, pradius, category, { debug: true });

    console.log("complementary_raw",complementary_raw_debug)

    // Convert to numbers safely
    const pop_density = Number(pop_density_raw) || 0;
    const competitors = competitors_raw.count;
    const distance = Number(distance_raw);
    const complementary = complementary_raw.count || 0;

    console.log("pop_density",pop_density)
    console.log("competitors",competitors)
    console.log("distance",distance)
    console.log("complementary",complementary)
    
    const population_density_norm = safeNormalize(pop_density, min_pop_density, max_pop_density);

    // competition: normalize then invert so fewer competitors -> higher contribution
    const competition_norm_raw = safeNormalize(competitors, min_competitors, max_competitors);
    const competition_effect = clampVal(1 - competition_norm_raw, 0, 1); // higher => better

    // accessibility: closer distance is better
    const accessibility_score = clampVal(1 - (Number(distance) / (Number(max_distance) || 1)), 0, 1);

    // complementary businesses: normalized to [0,1]
    const complementary_business_score = safeNormalize(complementary, 0, max_count_complementary);

    const scoreRaw =
      (0.4 * population_density_norm) +
      (0.3 * competition_effect) +
      (0.1 * accessibility_score) +
      (0.2 * complementary_business_score);

// clamp the final score to [0,1]
const score = clampVal(scoreRaw, 0, 1);

let result;
if (score >= upper_range) result = "Highly Suitable";
else if (score >= lower_range) result = "Moderate";
else result = "Not Suitable";
    
    return res.status(200)
    .json(new ApiResponse(200,{result,score},"Score Calculated Successfully"))
})

export {calculate_score};