import { Card, CardContent } from '@/components/primitives/card';
import { Progress } from '@/components/primatives/progress';
import type { QueuedMedia } from '@/lib/media/queue';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@phosphor-icons/react';

interface QueuedMediaCardProps {
  item: QueuedMedia;
}

export function QueuedMediaCard({ item }: QueuedMediaCardProps) {
  const getStatusIcon = () => {
    switch (item.status) {
      case 'pending':
        return <ClockIcon className="w-5 h-5 text-gray-400" weight="fill" />;
      case 'uploading':
        return <span className="text-sm text-gray-600">{item.progress}%</span>;
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

  const hasMetadata = item.duration || item.width || item.height || item.recordedAt || item.latitude || item.longitude;

  return (
    <Card className="py-4">
      <CardContent className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="font-medium truncate flex-1">{item.fileName}</span>
          <div className="flex items-center gap-2 ml-2">
            {getStatusIcon()}
          </div>
        </div>

        {item.status === 'uploading' && (
          <Progress value={item.progress} />
        )}

        {item.status === 'completed' && item.videoId && (
          <div className="text-sm text-green-600">
            Video ID: {item.videoId}
          </div>
        )}

        {item.status === 'failed' && item.error && (
          <div className="text-sm text-red-600">
            Error: {item.error}
          </div>
        )}

        {hasMetadata && (
          <div className="text-xs text-gray-500 space-y-1">
            {(item.width && item.height) && (
              <div>{item.width} × {item.height}</div>
            )}
            {item.duration && (
              <div>Duration: {formatDuration(item.duration)}</div>
            )}
            {item.recordedAt && (
              <div>Recorded: {formatDate(item.recordedAt)}</div>
            )}
            {(item.latitude && item.longitude) && (
              <div>Location: {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
