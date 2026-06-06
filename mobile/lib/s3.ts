/**
 * Upload a local file (from expo-image-picker uri) to a presigned S3 URL.
 * The presigned URL comes from the `s3.getPresignedUrl` tRPC mutation.
 */
export async function putToPresignedUrl(
  uploadUrl: string,
  uri: string,
  contentType: string,
): Promise<void> {
  const fileRes = await fetch(uri);
  const blob = await fileRes.blob();
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: blob,
  });
  if (!res.ok) {
    throw new Error(`Upload failed (${res.status})`);
  }
}
