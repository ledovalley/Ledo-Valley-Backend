export const isValidPhone = (phone) => {
  const cleaned = phone.replace(/\D/g, "");

  if (cleaned.length !== 10) return false;

  // Rule: Not all same digits (e.g., 1111111111)
  if (/^(\d)\1{9}$/.test(cleaned)) return false;

  // Rule: Not strictly sequential (e.g., 1234567890 or 0987654321)
  const sequentialUp = "01234567890123456789";
  const sequentialDown = "98765432109876543210";
  if (sequentialUp.includes(cleaned) || sequentialDown.includes(cleaned)) return false;

  // Rule: Not a repeating pattern (e.g., 1212121212 or 1234512345)
  if (/^(\d{2})\1{4}$/.test(cleaned)) return false;
  if (/^(\d{5})\1{1}$/.test(cleaned)) return false;

  return true;
};
