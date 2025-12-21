import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2 Storage Client
 *
 * R2 is S3-compatible, so we use the AWS SDK with Cloudflare's endpoint.
 * This is used for storing inspection photos and documents.
 */

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "buildsense-files";

// Create S3 client configured for Cloudflare R2
// Returns null if R2 is not configured (for development)
export const r2Client = R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY
  ? new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    })
  : null;

/**
 * Generate a presigned URL for uploading a file to R2
 *
 * @param key - The object key (file path in bucket)
 * @param contentType - The MIME type of the file
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns Presigned URL for uploading
 */
export async function getUploadUrl(key: string, contentType: string, expiresIn = 3600): Promise<string> {
  if (!r2Client) {
    throw new Error("R2 storage is not configured");
  }
  
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Generate a presigned URL for downloading a file from R2
 *
 * @param key - The object key (file path in bucket)
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns Presigned URL for downloading
 */
export async function getDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  if (!r2Client) {
    throw new Error("R2 storage is not configured");
  }
  
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Generate a unique file key for storing inspection photos
 *
 * @param projectId - The project ID
 * @param checklistItemId - The checklist item ID
 * @param filename - Original filename
 * @returns Unique file key
 */
export function generatePhotoKey(projectId: string, checklistItemId: string, filename: string): string {
  const timestamp = Date.now();
  const extension = filename.split(".").pop() || "jpg";
  return `projects/${projectId}/inspections/${checklistItemId}/${timestamp}.${extension}`;
}

/**
 * Generate a unique file key for storing documents
 *
 * @param projectId - The project ID
 * @param filename - Original filename
 * @returns Unique file key
 */
export function generateDocumentKey(projectId: string, filename: string): string {
  const timestamp = Date.now();
  return `projects/${projectId}/documents/${timestamp}-${filename}`;
}

