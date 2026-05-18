/**
 * Validates the GSTIN (Goods and Services Tax Identification Number) format in India.
 * Format: 15-character alphanumeric.
 * - First 2 characters: State Code (numeric)
 * - Next 10 characters: PAN (alphanumeric - 5 letters, 4 digits, 1 letter)
 * - 13th character: Entity code (numeric/alphabetic)
 * - 14th character: Character 'Z'
 * - 15th character: Check digit (alphanumeric)
 */
export function validateGST(gst) {
  if (!gst) return 'GST number is required';
  const cleanGst = gst.trim().toUpperCase();
  if (cleanGst.length !== 15) {
    return 'GST number must be exactly 15 characters long';
  }
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!gstRegex.test(cleanGst)) {
    return 'Invalid GST format (Example: 27AXVPS9856J1Z4)';
  }
  return null; // Null means validation passes
}
