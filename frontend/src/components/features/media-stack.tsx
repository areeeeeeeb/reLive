import { MediaSelection, getMediaThumbnails } from '@/lib/media/selection';

interface MediaStackProps {
  mediaSelection: MediaSelection;
}

export default function MediaStack({ mediaSelection }: MediaStackProps) {
  const thumbnails = getMediaThumbnails(mediaSelection);
  const itemCount = mediaSelection.length;

  // more items = more compact spacing
  const verticalOverlap = itemCount > 5 ? '-mt-20' : itemCount > 3 ? '-mt-16' : '-mt-12';

  const renderMediaItems = () => {
    return mediaSelection.map((item, index) => {
      // random px offset
      const seed = index * 21221738;
      const randomValue = (seed % 100) / 100;
      const isLeft = index % 2 === 0;
      const offsetPx = Math.floor(randomValue * 40 + 8); // random between 8-48px

      let content;
      if (item.source === 'web') {
        // TODO: generate thumbnails for web files as well
        content = (
          <div className="w-full h-full bg-muted flex items-center justify-center ">
            <p className="text-sm text-muted-foreground">{item.handle.name}</p>
          </div>
        );
      } else {
        // native: PhotoLibraryAsset
        content = thumbnails[index] ? (
          <img
            src={thumbnails[index]!}
            alt={item.asset.fileName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No thumbnail</p>
          </div>
        );
      }

      return (
        <div
          key={index}
          className={`relative w-48 h-48 rounded-2xl shadow-lg overflow-hidden ${isLeft ? '' : 'self-end'} ${verticalOverlap} first:mt-0 animate-float`}
          style={{
            animationDelay: `${index * 0.2}s`,
            [isLeft ? 'marginLeft' : 'marginRight']: `${offsetPx}px`,
          }}
        >
          {content}
        </div>
      );
    });
  };

  return (
    <>
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-7px) rotate(1deg);
          }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
      <div className="flex flex-col items-start justify-center h-full pl-4 py-8 w-full max-w-md mx-auto">
        {renderMediaItems()}
      </div>
    </>
  );
}
