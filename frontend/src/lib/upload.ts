// =============================================================================
// Upload Orchestrator
// Combines v2api (backend) and s3 (object storage) to handle the full upload flow
// =============================================================================

import { uploadVideoInit, uploadVideoConfirm } from './v2api/videos';
// import { presignPart } from './v2api/videos';  // TODO: add to videos.ts when ready

import { putPresigned } from './s3/upload';

const PART_SIZE = 10 * 1024 * 1024; // 10 MB

async function uploadParts(){
    // TODO:
    // using presigned URL, upload parts to s3 with designated part size
}

// v2 upload video flow
export async function uploadVideo(){
    // TODO: 
    // 1. Initialize upload
    // 2. Upload parts with uploadParts()
    // 3. Confirm upload
    // 4. return video ID
}


//will have photo upload flow later

