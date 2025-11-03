import {Router} from "express"
import { getUserData } from "../controllers/user.controller.js";



const router = Router();

router.route("/getUserData").post(getUserData)


export default router;