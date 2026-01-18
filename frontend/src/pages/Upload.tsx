import { useParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useIonRouter } from '@ionic/react';
import { PageContent } from '@/components/layout/page-content';
import { VideoUploadCard, VideoUploadCardRef } from '@/components/ui/video-upload-card';
import { getPendingFiles, clearPendingFiles, hasPendingFiles, getShouldClearVideos, resetShouldClearVideos } from '@/lib/uploadQueue';
import { Button } from '@/components/ui/button';
import { UserVideo } from '@/hooks/useVideoGallery';
import { Sheet, SheetContent } from '@/components/ui/sheet';

const Upload: React.FC = () => {
  const { eventId } = useParams<{ eventId?: string }>();
  const router = useIonRouter();
  const videoUploadRef = useRef<VideoUploadCardRef>(null);
  const hasProcessedPendingRef = useRef(false);
  const [showSheet, setShowSheet] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadedVideos, setUploadedVideos] = useState<UserVideo[]>([]);
  const [slideOutUpload, setSlideOutUpload] = useState(false);

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

  const handleProceed = () => {
    // Get videos from the upload card
    const videos = videoUploadRef.current?.getVideos() || [];
    setUploadedVideos(videos);
    setSlideOutUpload(true);
    setShowSheet(false);

    // Transition to step 1 after animation
    setTimeout(() => {
      setCurrentStep(1);
    }, 500);
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
        <div className="fixed inset-0 flex flex-col items-center pt-8">
          <div className="flex flex-col items-center gap-y-3 max-w-md w-full overflow-y-scroll ">
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

            {/* Question */}
            <div className="text-left w-full">
              <p className="text-2xl font-bold">
                Sunn O)))
              </p>
              <p className="text-lg text-chartreuse">
                Tue, Apr 14 at 7:00 PM
              </p>
              <p className="text-md ">
                131 McCormack Street
              </p>

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
