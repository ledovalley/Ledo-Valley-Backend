export const normalizePhone = (phone) => {
  if (!phone) return null;

  // Remove all spaces, dashes, brackets, dots
  let cleaned = phone.toString().replace(/[\s\-().]/g, "").trim();

  // Already in E.164 format
  if (cleaned.startsWith("+")) return cleaned;

  // Remove leading 0 if present (e.g. 09876543210)
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.slice(1);
  }

  // Remove country code 91 if already added without +
  if (cleaned.startsWith("91") && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  }

  return `+91${cleaned}`;
};