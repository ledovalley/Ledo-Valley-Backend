export const normalizePhone = (phone) => {
  if (!phone) return null;

  // already in E.164 format
  if (phone.startsWith("+")) return phone;

  // India default (change if needed)
  return `+91${phone}`;
};
