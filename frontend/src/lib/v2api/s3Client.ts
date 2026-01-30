import { S3 } from "@aws-sdk/client-s3";

import {
    DO_SPACES_ENDPOINT, 
    DO_SPACES_BUCKET, 
    DO_SPACES_REGION, 
    DO_SPACES_KEY, 
    DO_SPACES_SECRET, 
    DO_SPACES_CDN_URL  
} from './config';


const s3Client = new S3({
    forcePathStyle: false, // Configures to use subdomain/virtual calling format.
    endpoint: DO_SPACES_ENDPOINT,
    region: DO_SPACES_REGION,
    credentials: {
      accessKeyId: DO_SPACES_KEY,
      secretAccessKey: DO_SPACES_SECRET
    }
});

export { s3Client };