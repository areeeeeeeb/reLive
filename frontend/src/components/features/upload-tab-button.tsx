import { PlusCircleIcon } from '@phosphor-icons/react';
import { setPendingMedia } from '@/lib/uploadQueue';
import { selectMedia } from '@/lib/mediaSelection';
import TabButton from '../primitives/tab-button';
import { useIonRouter } from '@ionic/react';

export default function UploadTabButton() {
  const router = useIonRouter();

  const handleUploadClick = async (e: any) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const selection = await selectMedia({
        selectionLimit: undefined,
        includeVideos: true,
        includeImages: true,
      });
      setPendingMedia(selection);
      router.push('/upload', 'none');
    } catch (error) {
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
