import { useEffect, useState } from 'react';
import { PageContent } from '@/components/layout/page-content';
import { subscribeToPendingMedia, clearPendingMedia } from '@/lib/uploadQueue';
import { MediaSelection } from '@/lib/mediaSelection';

const Upload: React.FC = () => {
  const [pendingMedia, setPendingMedia] = useState<MediaSelection | null>(null);

  useEffect(() => {
    // subscribe to pending media changes
    const unsubscribe = subscribeToPendingMedia((media) => {
      setPendingMedia(media);
    });
    // cleanup subscription on unmount
    return unsubscribe;
  }, []);

  const handleClear = () => {
    clearPendingMedia();
  };

  const getMediaCount = () => {
    if (!pendingMedia) return 0;
    return pendingMedia.source === 'web'
      ? pendingMedia.handles.length
      : pendingMedia.assets.length;
  };

  const renderMediaItems = () => {
    if (!pendingMedia) return null;

    if (pendingMedia.source === 'web') {
      return pendingMedia.handles.map((handle, index) => (
        <div key={index} className="p-4 border rounded-lg">
          <p className="font-medium">{handle.name}</p>
          <p className="text-sm text-muted-foreground">Web File Handle</p>
        </div>
      ));
    } else {
      return pendingMedia.assets.map((asset, index) => (
        <div key={index} className="p-4 border rounded-lg">
          <p className="font-medium">{asset.fileName}</p>
          <p className="text-sm text-muted-foreground">{asset.mimeType}</p>
          <p className="text-sm text-muted-foreground">Asset ID: {asset.id}</p>
        </div>
      ));
    }
  };

  return (
    <PageContent title="upload" hideMobileHeader>
      <div className="p-8">
        <h2 className="text-2xl font-bold mb-4">Pending Media</h2>

        {!pendingMedia ? (
          <p className="text-muted-foreground">No pending media</p>
        ) : (
          <>
            <p className="mb-4">
              Found {getMediaCount()} {pendingMedia.source} file(s)
            </p>
            <div className="flex flex-col gap-4">
              {renderMediaItems()}
            </div>
            <button
              onClick={handleClear}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg"
            >
              Clear Pending Media
            </button>
          </>
        )}
      </div>
    </PageContent>
  );
};

export default Upload;
