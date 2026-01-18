import { useState } from "react";
import { isPlatform } from '@ionic/react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

export interface UserVideo {
  filepath: string;
  webviewPath?: string;
  filename: string;
}

export function useVideoGallery() {
  const [videos, setVideos] = useState<UserVideo[]>([]);

  const saveVideo = async (file: File): Promise<UserVideo> => {
    if (isPlatform('hybrid')) {
      // On iOS/Android, save to Cache directory (temporary storage)
      // Cache files can be cleared by the system and are not backed up
      const fileName = new Date().getTime() + '_' + file.name;
      const base64Data = await base64FromFile(file);

      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache // Use Cache instead of Data - this is temporary
      });

      const webviewPath = Capacitor.convertFileSrc(savedFile.uri);
      return {
        filepath: savedFile.uri,
        webviewPath: webviewPath,
        filename: file.name
      };
    } else {
      // On web, use blob URL (temporary, in-memory)
      const blobUrl = URL.createObjectURL(file);
      return {
        filepath: file.name,
        webviewPath: blobUrl,
        filename: file.name
      };
    }
  };

  const deleteVideo = async (video: UserVideo) => {
    // Remove from videos array
    const newVideos = videos.filter(v => v.filepath !== video.filepath);
    setVideos(newVideos);

    if (isPlatform('hybrid')) {
      // Delete cached file on iOS/Android
      const filename = video.filepath.substring(video.filepath.lastIndexOf('/') + 1);
      try {
        await Filesystem.deleteFile({
          path: filename,
          directory: Directory.Cache
        });
      } catch (error) {
        console.error('Error deleting cached video:', error);
      }
    } else {
      // Clean up blob URL if on web
      if (video.webviewPath?.startsWith('blob:')) {
        URL.revokeObjectURL(video.webviewPath);
      }
    }
  };

  return {
    videos,
    saveVideo,
    deleteVideo
  };
}

export async function base64FromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove the data URL prefix to get just base64
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject('method did not return a string');
      }
    };
    reader.readAsDataURL(file);
  });
}
