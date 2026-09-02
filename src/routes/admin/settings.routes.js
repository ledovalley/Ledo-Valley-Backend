import express from "express";
import { getSettingsAdmin, updateSettingsAdmin } from "../../controllers/admin/settings.controller.js";
import { authenticateAdmin } from "../../middlewares/authenticateAdmin.js";

const router = express.Router();

router.get("/", authenticateAdmin, getSettingsAdmin);
router.put("/", authenticateAdmin, updateSettingsAdmin);

export default router;
