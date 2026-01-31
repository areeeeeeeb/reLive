import axios from 'axios';

// barebones axios client for S3 presigned uploads
// no auth header — presigned URLs contain auth in query params
// no baseURL — presigned URLs are absolute
const s3Client = axios.create({
  timeout: 5 * 60 * 1000, // 5 minutes for large uploads, can change later
});

export default s3Client;

