import express from "express";
import { getSettingsPublic } from "../../controllers/customer/settings.controller.js";

const router = express.Router();

router.get("/settings", getSettingsPublic);

export default router;
