import axios from "axios";
import crypto from "crypto";

export const refundPayU = async (order) => {
  const key = process.env.PAYU_KEY;
  const salt = process.env.PAYU_SALT;

  const command = "cancel_refund_transaction";
  const var1 = order.payment.payuPaymentId;
  const var2 = order.grandTotal; // refund amount
  const var3 = `REF${Date.now()}`; // unique refund id

  const hashString = `${key}|${command}|${var1}|${salt}`;
  const hash = crypto
    .createHash("sha512")
    .update(hashString)
    .digest("hex");

  const response = await axios.post(
    "https://info.payu.in/merchant/postservice?form=2",
    {
      key,
      command,
      var1,
      var2,
      var3,
      hash,
    }
  );

  return response.data;
};

