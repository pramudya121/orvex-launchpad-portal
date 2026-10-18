export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
export function validateLogoSize(size: number, type: string) {
  if (!Number.isInteger(size) || size <= 0 || size > LOGO_MAX_BYTES)
    throw new Error("Logo must be between 1 byte and 2MB");
  if (!LOGO_TYPES.some((t) => t === type)) throw new Error("Choose PNG, JPEG, WebP or GIF");
}
export function decodeLogo(base64: string, type: string) {
  if (base64.length > 4 * Math.ceil(LOGO_MAX_BYTES / 3)) throw new Error("Logo must be at most 2MB");
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64))
    throw new Error("Invalid logo encoding");
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  validateLogoSize(bytes.length, type);
  const match = type === "image/png" ? [137,80,78,71,13,10,26,10].every((b,i) => bytes[i] === b)
    : type === "image/jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : type === "image/gif" ? /GIF8[79]a/.test(String.fromCharCode(...bytes.slice(0,6)))
    : String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP";
  if (!match) throw new Error("Logo content does not match its image type");
  return bytes;
}