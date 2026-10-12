/*
 * Settings the server enforces, mirrored here so a form can say the rule
 * before it is refused. Written into the bundle when the image is built, from
 * the same .env values the services read (compose passes them as build
 * arguments), so the two never disagree.
 */
export const PASSWORD_MIN_LENGTH = Number(import.meta.env.VITE_PASSWORD_MIN_LENGTH) || 8;
export const ADMIN_PASSWORD_MIN_LENGTH = Number(import.meta.env.VITE_ADMIN_PASSWORD_MIN_LENGTH) || 12;
export const MAX_UPLOAD_MB = Number(import.meta.env.VITE_MAX_UPLOAD_MB) || 25;
