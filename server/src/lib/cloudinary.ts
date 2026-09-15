import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config';

/**
 * Cloudinary client for stream thumbnail uploads.
 *
 * Configured once at import from server env. If the credentials are missing the
 * client is left unconfigured and `cloudinaryConfigured` is false — the upload
 * route checks this and returns 503 rather than throwing. The API secret never
 * leaves the server.
 */
export const cloudinaryConfigured = Boolean(
  config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret
);

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
  });
}

export { cloudinary };
