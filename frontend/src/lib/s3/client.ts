import axios from 'axios';

// barebones axios client for S3 presigned uploads
// no auth header — presigned URLs contain auth in query params
// no baseURL — presigned URLs are absolute
const s3Client = axios.create({});

export default s3Client;

