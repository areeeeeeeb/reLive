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

  const handleNext = async () => {
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
      setCurrentStep(prev => Math.min(prev + 1, 3));
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

  // TODO: smooth step transitions
  const renderStep = () => {
    if (queuedItems.length === 0) return <div />;
    switch (currentStep) {
      case 1:
        const mediaSelection = queuedItems.map(item => item.media);
        return <MediaStack mediaSelection={mediaSelection} />;
      case 2:
        return (
          <div className="p-6 space-y-4">
            {queuedItems.map((item) => (
              <QueuedMediaCard key={item.id} item={item} />
            ))}
          </div>
        );
      case 3:
        return <div className="p-6">Step 3: Review & Upload</div>;
      default:
        return <div />;
    }
  };

  const allUploadsComplete = queuedItems.length > 0 && queuedItems.every(u => u.status === 'completed');

  return (
    <PageContent title="upload" hideMobileHeader refreshable={false}>
      {renderStep()}
      {queuedItems.length > 0 && (
        <MobileStepNavigation
          step={currentStep}
          maxStep={3}
          canProceed={currentStep === 1 || (currentStep === 2 && allUploadsComplete && !isUploading)}
          onBack={handleBack}
          onNext={handleNext}
        />
      )}
    </PageContent>
  );
};

export default Upload;
