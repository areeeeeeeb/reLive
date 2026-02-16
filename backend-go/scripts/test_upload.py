# Test script for the multipart video upload flow.
# Usage:
#   python scripts/test_upload.py <path_to_video>

import sys
import os
import json
import math
import time
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

API_BASE = "http://localhost:8081"

def init_upload(filename: str, content_type: str, size_bytes: int) -> dict:
    url = f"{API_BASE}/v2/api/dev/videos/upload/init"
    payload = json.dumps({
        "filename": filename,
        "contentType": content_type,
        "sizeBytes": size_bytes,
    }).encode()

    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


CONCURRENT_UPLOADS = 5


def upload_single_part(part_number: int, url: str, chunk: bytes, total_parts: int) -> dict:
    """Upload a single part to its presigned S3 URL."""
    req = urllib.request.Request(url, data=chunk, method="PUT")
    req.add_header("Content-Type", "application/octet-stream")
    req.add_header("Content-Length", str(len(chunk)))

    with urllib.request.urlopen(req) as resp:
        etag = resp.getheader("ETag", "").strip('"')
        print(f"    Part {part_number}/{total_parts} done (ETag: {etag})")
        return {"partNumber": part_number, "etag": etag}


def upload_parts(file_path: str, part_urls: list[str], part_size: int) -> list[dict]:
    """Upload file chunks to presigned S3 URLs concurrently."""
    total_parts = len(part_urls)

    # Read all chunks into memory first (needed for concurrent access)
    chunks = []
    with open(file_path, "rb") as f:
        for _ in range(total_parts):
            chunk = f.read(part_size)
            if not chunk:
                break
            chunks.append(chunk)

    print(f"  Uploading {len(chunks)} parts with {CONCURRENT_UPLOADS} concurrent connections...")

    parts = []
    with ThreadPoolExecutor(max_workers=CONCURRENT_UPLOADS) as executor:
        futures = {
            executor.submit(upload_single_part, i + 1, part_urls[i], chunks[i], total_parts): i
            for i in range(len(chunks))
        }
        for future in as_completed(futures):
            parts.append(future.result())

    # Sort by part number (S3 confirm needs them in order)
    parts.sort(key=lambda p: p["partNumber"])
    return parts


def confirm_upload(video_id: int, upload_id: str, parts: list[dict]) -> dict:
    url = f"{API_BASE}/v2/api/dev/videos/{video_id}/upload/confirm"
    payload = json.dumps({
        "uploadId": upload_id,
        "parts": parts,
    }).encode()

    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def guess_content_type(filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    types = {
        ".mp4": "video/mp4",
        ".mov": "video/quicktime",
        ".avi": "video/x-msvideo",
        ".mkv": "video/x-matroska",
        ".webm": "video/webm",
    }
    return types.get(ext, "video/mp4")


def main():
    if len(sys.argv) < 2:
        print("Usage: python test_upload.py <path_to_video>")
        sys.exit(1)

    file_path = sys.argv[1]
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        sys.exit(1)

    filename = os.path.basename(file_path)
    file_size = os.path.getsize(file_path)
    content_type = guess_content_type(filename)

    start_time = time.time()

    print(f"File: {filename}")
    print(f"Size: {file_size / (1024*1024):.1f} MB")
    print(f"Type: {content_type}")
    print()

    # Step 1: Init upload
    print("Step 1: Initializing upload...")
    try:
        init_resp = init_upload(filename, content_type, file_size)
    except urllib.error.URLError as e:
        print(f"Failed to connect to {API_BASE}. Is the backend running?")
        print(f"Error: {e}")
        sys.exit(1)

    video_id = init_resp["videoId"]
    upload_id = init_resp["uploadId"]
    part_urls = init_resp["partUrls"]
    part_size = init_resp["partSize"]

    print(f"  Video ID: {video_id}")
    print(f"  Upload ID: {upload_id}")
    print(f"  Parts: {len(part_urls)} x {part_size / (1024*1024):.1f} MB")
    print()

    # Step 2: Upload parts to S3
    print("Step 2: Uploading parts to S3...")
    try:
        parts = upload_parts(file_path, part_urls, part_size)
    except Exception as e:
        print(f"Upload failed: {e}")
        sys.exit(1)
    print()

    # Step 3: Confirm upload
    print("Step 3: Confirming upload...")
    try:
        confirm_resp = confirm_upload(video_id, upload_id, parts)
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"Confirm failed ({e.code}): {body}")
        sys.exit(1)

    print(f"  Video ID: {confirm_resp['videoId']}")
    print(f"  Status: {confirm_resp['status']}")
    print()

    elapsed = time.time() - start_time
    print(f"Upload complete! Total time: {elapsed:.1f}s ({file_size / (1024*1024) / elapsed:.1f} MB/s)")


if __name__ == "__main__":
    main()
