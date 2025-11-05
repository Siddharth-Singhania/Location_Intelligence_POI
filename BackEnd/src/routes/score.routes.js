import { Router } from "express";
import { calculate_score } from "../controllers/POI.controller.js";




const router = Router();

router.route("/getScore").get(calculate_score)


export default router;