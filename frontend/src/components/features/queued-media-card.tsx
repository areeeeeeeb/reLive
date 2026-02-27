import { Card, CardContent } from '@/components/primitives/card';
import { Progress } from '@/components/primitives/progress';
import type { QueuedMedia } from '@/lib/media/queue';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@phosphor-icons/react';

interface QueuedMediaCardProps {
  item: QueuedMedia;
}

export function QueuedMediaCard({ item }: QueuedMediaCardProps) {
  const getStatusIcon = () => {
    switch (item.uploadStatus) {
      case 'pending':
        return <ClockIcon className="w-5 h-5 text-gray-400" weight="fill" />;
      case 'uploading':
        return <span className="text-sm text-gray-600">{item.uploadProgress}%</span>;
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" weight="fill" />;
      case 'failed':
        return <XCircleIcon className="w-5 h-5 text-red-600" weight="fill" />;
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (date?: Date) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString();
  };

  const hasMetadata = item.metadata.duration || item.metadata.width || item.metadata.height || item.metadata.recordedAt || item.metadata.latitude || item.metadata.longitude;

  return (
    <Card className="py-4">
      <CardContent className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="font-medium truncate flex-1">{item.fileName}</span>
          <div className="flex items-center gap-2 ml-2">
            {getStatusIcon()}
          </div>
        </div>

        {item.uploadStatus === 'uploading' && (
          <Progress value={item.uploadProgress} />
        )}

        {item.uploadStatus === 'completed' && item.videoId && (
          <div className="text-sm text-green-600">
            Video ID: {item.videoId}
          </div>
        )}

        {item.uploadStatus === 'failed' && item.uploadError && (
          <div className="text-sm text-red-600">
            Error: {item.uploadError}
          </div>
        )}

        {hasMetadata && (
          <div className="text-xs text-gray-500 space-y-1">
            {(item.metadata.width && item.metadata.height) && (
              <div>{item.metadata.width} × {item.metadata.height}</div>
            )}
            {item.metadata.duration && (
              <div>Duration: {formatDuration(item.metadata.duration)}</div>
            )}
            {item.metadata.recordedAt && (
              <div>Recorded: {formatDate(item.metadata.recordedAt)}</div>
            )}
            {(item.metadata.latitude && item.metadata.longitude) && (
              <div>Location: {item.metadata.latitude.toFixed(4)}, {item.metadata.longitude.toFixed(4)}</div>
            )}
          </div>
        )}

        {/* Concert Detection Results */}
        <div className="text-xs space-y-1">
          <div className="text-gray-600">
            Detection: <span className={
              item.detectingStatus === 'completed' ? 'text-green-600' :
              item.detectingStatus === 'failed' ? 'text-red-600' :
              'text-yellow-600'
            }>
              {item.detectingStatus}
            </span>
          </div>
          {item.concertMatches && item.concertMatches.length > 0 && (
            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
              <div className="font-medium mb-1">Concert Matches:</div>
              <pre className="whitespace-pre-wrap wrap-break-word">
                {JSON.stringify(item.concertMatches, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
