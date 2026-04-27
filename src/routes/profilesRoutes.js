import express from "express";
import {
  createProfile,
  getProfile,
  getAllProfiles,
  deleteProfile,
} from "../controllers/profilesController.js";

const router = express.Router();

router.post("/", createProfile);
router.get("/", getAllProfiles);
router.get("/:profileId", getProfile);
router.delete("/:profileId", deleteProfile);

export default router;
