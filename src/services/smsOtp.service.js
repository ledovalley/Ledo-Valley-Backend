import twilio from "twilio";
import { env } from "../config/env.js";

const client = twilio(
  env.TWILIO_ACCOUNT_SID,
  env.TWILIO_AUTH_TOKEN
);

export const sendOtpSms = async (phone) => {
  await client.verify.v2
    .services(env.TWILIO_VERIFY_SID)
    .verifications.create({
      to: phone,
      channel: "sms",
    });
};

export const verifyOtpSms = async (phone, otp) => {
  const result = await client.verify.v2
    .services(env.TWILIO_VERIFY_SID)
    .verificationChecks.create({
      to: phone,
      code: otp,
    });

  return result.status === "approved";
};
