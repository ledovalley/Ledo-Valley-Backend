import twilio from "twilio";
import { env } from "../config/env.js";

const client = twilio(
  env.TWILIO_ACCOUNT_SID,
  env.TWILIO_AUTH_TOKEN
);

export const sendOtpSms = async (phone) => {
  try {
    await client.verify.v2
      .services(env.TWILIO_VERIFY_SID)
      .verifications.create({
        to: phone,
        channel: "sms",
      });
  } catch (error) {
    console.error("TWILIO SEND OTP ERROR:", error?.message);

    // Give useful error messages based on Twilio error codes
    if (error?.code === 60200) {
      throw new Error("Invalid phone number format");
    }

    if (error?.code === 60203) {
      throw new Error("Maximum OTP attempts reached. Please try after 10 minutes");
    }

    if (error?.code === 60212) {
      throw new Error("Too many requests. Please wait before requesting another OTP");
    }

    throw new Error("Failed to send OTP. Please try again");
  }
};

export const verifyOtpSms = async (phone, otp) => {
  try {
    const result = await client.verify.v2
      .services(env.TWILIO_VERIFY_SID)
      .verificationChecks.create({
        to: phone,
        code: otp,
      });

    return result.status === "approved";
  } catch (error) {
    console.error("TWILIO VERIFY OTP ERROR:", error?.message);

    if (error?.code === 60202) {
      throw new Error("Maximum OTP verification attempts reached. Please request a new OTP");
    }

    if (error?.code === 20404) {
      throw new Error("OTP has expired. Please request a new one");
    }

    throw new Error("OTP verification failed. Please try again");
  }
};
