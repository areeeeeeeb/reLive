import { useEffect, useState } from 'react';
import { PageContent } from '@/components/layout/page-content';
import { subscribeToQueue, clearQueueAndDeleteUploads, type QueuedMedia } from '@/lib/media/queue';
import { MobileStepNavigation } from '@/components/features/mobile-step-navigation';
import { useIonRouter } from '@ionic/react';
import { processUploads } from '@/lib/media/upload';
import { QueuedMediaCard } from '@/components/features/queued-media-card';
import MediaStack from '@/components/features/media-stack';

const Upload: React.FC = () => {
  const [queuedItems, setQueuedItems] = useState<QueuedMedia[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [canProceed, setCanProceed] = useState(true);
  const router = useIonRouter();

  useEffect(() => {
    // subscribe to queue changes
    const unsubscribe = subscribeToQueue((queue) => {
      setQueuedItems(queue);
      // reset to step 1 when new items are queued
      if (queue.length > 0 && currentStep === 0) {
        setCurrentStep(1);
      }
    });
    // cleanup subscription
    return () => {
      unsubscribe();
    };
  }, [currentStep]);

  // Update canProceed based on concert detection status on step 1
  useEffect(() => {
    if (currentStep !== 1 || queuedItems.length === 0) return;
    const allDetectionComplete = queuedItems.every(
      item => item.detectingStatus === 'completed' || item.detectingStatus === 'failed'
    );
    setCanProceed(allDetectionComplete);
  }, [currentStep, queuedItems]);

  const handleNext = async () => {
    const maxStep = queuedItems.length + 2; // step 1 + one step per item + final review step

    if (currentStep === 1 && queuedItems.length > 0) {
      // step 1 -> step 2: start uploading
      setIsUploading(true);
      setCurrentStep(2);
      try {
        await processUploads(queuedItems);
        setIsUploading(false);
      } catch (error) {
        setIsUploading(false);
        console.error('Upload error:', error);
      }
    } else {
      setCurrentStep(prev => Math.min(prev + 1, maxStep));
    }
  };

  const handleBack = async () => {
    // prevent going back while uploading
    if (isUploading) return;
    // if going back from first step, clear queue and delete any uploaded videos
    if (currentStep === 1) {
      await clearQueueAndDeleteUploads();
      router.goBack();
    }
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  // THESE STEPS ARE NOT FINAL: JUST FOR TESTING UPLOADS AND CONCERT DETECTION
  // TODO: smooth step transitions
  const renderStep = () => {
    if (queuedItems.length === 0) return <div />;

    // Step 1: Media stack preview
    if (currentStep === 1) {
      const mediaSelection = queuedItems.map(item => item.media);
      return <MediaStack mediaSelection={mediaSelection} />;
    }

    // steps 2 to (n+1): Individual queued media cards
    const itemStepIndex = currentStep - 2;
    if (itemStepIndex >= 0 && itemStepIndex < queuedItems.length) {
      const item = queuedItems[itemStepIndex];
      return (
        <div className="p-6">
          <QueuedMediaCard key={item.id} item={item} />
        </div>
      );
    }

    // final step
    if (currentStep === queuedItems.length + 2) {
      return <div className="p-6">Step {currentStep}: Review & Upload</div>;
    }

    return <div />;
  };

  const maxStep = queuedItems.length + 2;

  return (
    <PageContent title="upload" hideMobileHeader refreshable={false}>
      {renderStep()}
      {queuedItems.length > 0 && (
        <MobileStepNavigation
          step={currentStep}
          maxStep={maxStep}
          canProceed={canProceed}
          onBack={handleBack}
          onNext={handleNext}
        />
      )}
    </PageContent>
  );
};

export default Upload;
