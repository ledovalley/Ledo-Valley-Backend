import express from "express";
import {
  payuSuccess,
  payuFailure,
} from "../../controllers/customer/payment.controller.js";

const router = express.Router();

router.post("/payment/success", payuSuccess);
router.get("/payment/success", payuSuccess);
router.post("/payment/failure", payuFailure);
router.get("/payment/failure", payuFailure);


export default router;
