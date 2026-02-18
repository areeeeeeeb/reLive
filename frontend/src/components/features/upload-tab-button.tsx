import { PlusCircleIcon } from '@phosphor-icons/react';
import { addToQueue, clearQueue } from '@/lib/media/queue';
import { selectMedia } from '@/lib/media/selection';
import TabButton from '../primitives/tab-button';
import { useIonRouter, createAnimation } from '@ionic/react';

const delayedFade = (baseEl: HTMLElement) => {
  return createAnimation()
    .addElement(baseEl)
    .delay(300)
    .duration(300)
    .fromTo('opacity', '1', '0');
};

export default function UploadTabButton() {
  const router = useIonRouter();

  const handleUploadClick = async (e: any) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      clearQueue();
      router.push('/upload', 'forward', 'push', undefined, delayedFade);
      const selection = await selectMedia({
        selectionLimit: 10,
        includeVideos: true,
        includeImages: true,
      });
      await addToQueue(selection);
    } catch (error) {
      router.goBack();
      console.error('Failed to select media:', error);
      // user cancelled or error occurred
    }
  };

  return (
    <TabButton
      tab="upload"
      icon={PlusCircleIcon}
      onClick={handleUploadClick}
      iconClassName="text-chartreuse hover:text-chartreuse/80"
      weight="fill"
    />
  );
};

// signal to ionic that this is a tab bar button
UploadTabButton.isTabButton = true;
