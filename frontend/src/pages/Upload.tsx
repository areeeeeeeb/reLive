import { useParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useIonRouter, isPlatform } from '@ionic/react';
import { PageContent } from '@/components/layout/page-content';
import { VideoUploadCard, VideoUploadCardRef } from '@/components/ui/video-upload-card';
import { getPendingFiles, clearPendingFiles, hasPendingFiles, getShouldClearVideos, resetShouldClearVideos } from '@/lib/uploadQueue';
import { Button } from '@/components/ui/button';
import { UserVideo } from '@/hooks/useVideoGallery';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { uploadVideo, UploadVideoResponse } from '@/lib/api/videos';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/hooks/useAuth';
import { Filesystem, Directory } from '@capacitor/filesystem';

interface UploadedVideoData extends UserVideo {
  uploadResponse?: UploadVideoResponse;
}

const Upload: React.FC = () => {
  const { eventId } = useParams<{ eventId?: string }>();
  const router = useIonRouter();
  const { getUserId } = useAuth();
  const videoUploadRef = useRef<VideoUploadCardRef>(null);
  const hasProcessedPendingRef = useRef(false);
  const [showSheet, setShowSheet] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadedVideos, setUploadedVideos] = useState<UploadedVideoData[]>([]);
  const [slideOutUpload, setSlideOutUpload] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    // check if there are pending files from the tab bar
    if (hasPendingFiles() && !hasProcessedPendingRef.current) {
      hasProcessedPendingRef.current = true;
      const pendingFiles = getPendingFiles();
      // small delay to ensure component is mounted
      setTimeout(async () => {
        // clear existing videos if flag is set
        if (getShouldClearVideos()) {
          videoUploadRef.current?.clearVideos();
          resetShouldClearVideos();
        }
        // process each pending file sequentially with a delay to ensure animations trigger
        for (let i = 0; i < pendingFiles.length; i++) {
          await videoUploadRef.current?.handleFileUpload(pendingFiles[i]);
          // add a small delay between files to ensure state updates properly
          if (i < pendingFiles.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        // clear the pending files
        clearPendingFiles();
      }, 200);
    }
  }, []);

  const handleUploadComplete = () => {
    setShowSheet(true);
  };

  const handleProceed = async () => {
    // Get videos from the upload card
    const videos = videoUploadRef.current?.getVideos() || [];

    if (videos.length === 0) {
      return;
    }

    setIsUploading(true);
    setShowSheet(false);

    try {
      // Upload all videos to the API
      const uploadedVideosWithData: UploadedVideoData[] = [];

      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        setUploadProgress(Math.round(((i + 1) / videos.length) * 100));

        // Convert blob URL back to File/Blob for upload
        let videoFile: File | Blob;
        if (video.webviewPath?.startsWith('blob:')) {
          // Web: fetch the blob from blob URL
          const response = await fetch(video.webviewPath);
          videoFile = await response.blob();
        } else if (isPlatform('hybrid')) {
          // Mobile: read from Capacitor filesystem
          const fileName = video.filepath.substring(video.filepath.lastIndexOf('/') + 1);
          try {
            const fileData = await Filesystem.readFile({
              path: fileName,
              directory: Directory.Cache,
            });

            // Convert base64 to blob
            const base64Response = await fetch(`data:video/mp4;base64,${fileData.data}`);
            videoFile = await base64Response.blob();
          } catch (error) {
            console.error('Error reading mobile video file:', error);
            continue;
          }
        } else {
          console.warn('Unsupported platform for file upload');
          continue;
        }

        // Upload the video
        const uploadResponse = await uploadVideo(
          videoFile,
          {
            title: video.filename.replace(/\.[^/.]+$/, ''), // Remove extension from filename
            description: '',
          },
          getUserId() || 1, // Get userId from auth context, fallback to 1
          (progress) => {
            console.log(`Uploading video ${i + 1}/${videos.length}: ${progress}%`);
          }
        );

        uploadedVideosWithData.push({
          ...video,
          uploadResponse,
        });
      }

      setUploadedVideos(uploadedVideosWithData);
      setIsUploading(false);
      setSlideOutUpload(true);

      // Transition to step 1 after animation
      setTimeout(() => {
        setCurrentStep(1);
      }, 500);
    } catch (error) {
      console.error('Error uploading videos:', error);
      setIsUploading(false);
      // TODO: Show error message to user
    }
  };

  const handleCancel = () => {
    setShowSheet(false);
    videoUploadRef.current?.clearVideos();
    router.goBack();
  };

  const handleYes = () => {
    // Move to next video or finish
    if (currentStep < uploadedVideos.length) {
      setCurrentStep(currentStep + 1);
    } else {
      // All videos verified, proceed to next page
      console.log('All videos verified');
    }
  };

  const handleNo = () => {
    // Move to next video or finish
    if (currentStep < uploadedVideos.length) {
      setCurrentStep(currentStep + 1);
    } else {
      // All videos verified, proceed to next page
      console.log('All videos verified');
    }
  };

  return (
    <PageContent
      title="upload"
      back={eventId ? `/event/${eventId}` : undefined}
      hideMobileHeader
    >
      {/* Step 0: Video Upload */}
      <div
        className={`transition-all duration-500 ease-out ${
          slideOutUpload ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'
        }`}
      >
        <VideoUploadCard
          ref={videoUploadRef}
          onAnimationComplete={handleUploadComplete}
        />
      </div>

      {/* Steps 1+: Video Verification */}
      {currentStep > 0 && currentStep <= uploadedVideos.length && (
        <div className="fixed inset-0 flex flex-col items-center pt-8 px-8">
          <div className="flex flex-col items-center gap-y-8 max-w-md w-full overflow-y-scroll ">
            {/* Video Thumbnail */}
            <div className="w-sm aspect-square rounded-lg overflow-hidden shadow-lg">
              <video
                src={uploadedVideos[currentStep - 1]?.webviewPath}
                className="w-full h-full object-cover"
                muted
                playsInline
                preload="metadata"
              />
            </div>

            {/* Concert Information */}
            <div className="text-left w-full">
              {uploadedVideos[currentStep - 1]?.uploadResponse?.concert ? (
                <>
                  <p className="text-2xl font-bold">
                    {uploadedVideos[currentStep - 1]?.uploadResponse?.concert?.artist_name}
                  </p>
                  <p className="text-lg text-chartreuse">
                    {new Date(uploadedVideos[currentStep - 1]?.uploadResponse?.concert?.concert_date || '').toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </p>
                  <p className="text-md">
                    {uploadedVideos[currentStep - 1]?.uploadResponse?.concert?.venue_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {uploadedVideos[currentStep - 1]?.uploadResponse?.concert?.venue_city}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold">
                    {uploadedVideos[currentStep - 1]?.uploadResponse?.video.title || 'Unknown Concert'}
                  </p>
                  <p className="text-lg text-muted-foreground">
                    Concert information not detected
                  </p>
                </>
              )}

              <p className="text-sm text-muted-foreground mt-2">
                Video {currentStep} of {uploadedVideos.length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Sheet */}
      <Sheet open={showSheet || (currentStep > 0 && currentStep <= uploadedVideos.length)}>
        <SheetContent
          side="bottom"
          hideOverlay
          hideCloseButton
          className="rounded-t-lg border-t-0 p-8 bg-neutral-400 flex"
        >
          <div className="flex flex-col gap-2 pb-safe">
            {currentStep === 0 ? (
              <>
                <Button variant="secondary" onClick={handleCancel}>
                  Cancel
                </Button>

                <Button onClick={handleProceed}>
                  Proceed
                </Button>
              </>
            ) : (
              <>
                <p className='text-lg mb-2'>
                  All this information look correct?
                </p>
                <Button variant="outline" onClick={handleNo}>
                  No
                </Button>
                <Button onClick={handleYes}>
                  Yes
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </PageContent>
  );
};

export default Upload;
