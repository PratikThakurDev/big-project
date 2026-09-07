import { Router } from "express";
import {
  uploadVideo,
  getVideoById,
  getAllVideos,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
} from "../controllers/video.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/").get(getAllVideos)
.post(upload.fields([
  {
    name: "videoFile",
    maxCount: 1,
  },
  {
    name: "thumbnail",
    maxCount: 1,
  },
]), uploadVideo);

router.route("/:videoId").get(getVideoById)
.patch(upload.single("thumbnail"), updateVideo)
.delete(deleteVideo);

router.route("/:videoId/toggle/publish").patch(togglePublishStatus);

export default router;