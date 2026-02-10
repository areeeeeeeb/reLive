import { useParams } from 'react-router-dom';
import { PageContent } from '@/components/layout/page-content';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { getConcertPage, Video, ConcertPageResponse } from '@/lib/api/concerts';
import { IonSpinner } from '@ionic/react';
import { Play, Pause, SkipBack, SkipForward, Users, List, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/primitives/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/primitives/sheet';
import { useIonRouter } from '@ionic/react';
import { SetlistTable } from '@/components/ui/setlist-table';

interface VideoWithPosition extends Video {
  positionPercent: number;
  widthPercent: number;
  startMs: number;
  endMs: number;
}

interface VideoGroup {
  mainVideo: VideoWithPosition;
  alternateVideos: VideoWithPosition[];
  startMs: number;
  endMs: number;
  positionPercent: number;
  widthPercent: number;
}

const Watch: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useIonRouter();
  const [concertData, setConcertData] = useState<ConcertPageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [selectedVideoInGroup, setSelectedVideoInGroup] = useState(0); // 0 = main, 1-4 = alternates
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [globalProgress, setGlobalProgress] = useState(0);
  const [setlistOpen, setSetlistOpen] = useState(false);
  const mainVideoRef = useRef<HTMLVideoElement>(null);
  const altVideoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const seekBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchConcertData = async () => {
      if (!eventId) return;

      try {
        setLoading(true);
        const data = await getConcertPage(parseInt(eventId));
        setConcertData(data);
      } catch (err) {
        console.error('Error fetching concert data:', err);
        setError('Failed to load concert videos');
      } finally {
        setLoading(false);
      }
    };

    fetchConcertData();
  }, [eventId]);

  // Sort videos, calculate positions, and group overlapping videos
  const { videoGroups, totalDurationMs, startTime } = useMemo(() => {
    if (!concertData?.videos.length) return { videoGroups: [] as VideoGroup[], totalDurationMs: 0, startTime: 0 };

    const sortedVideos = [...concertData.videos].sort(
      (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );

    const timelineStart = new Date(sortedVideos[0].recorded_at).getTime();
    const lastVideo = sortedVideos[sortedVideos.length - 1];
    const timelineEnd = new Date(lastVideo.recorded_at).getTime() + (lastVideo.duration_seconds * 1000);
    const totalMs = timelineEnd - timelineStart;

    // Create videos with position data
    const videosWithPosition: VideoWithPosition[] = sortedVideos.map((video) => {
      const videoStartMs = new Date(video.recorded_at).getTime() - timelineStart;
      const videoEndMs = videoStartMs + (video.duration_seconds * 1000);
      const positionPercent = (videoStartMs / totalMs) * 100;
      const widthPercent = ((video.duration_seconds * 1000) / totalMs) * 100;

      return {
        ...video,
        positionPercent,
        widthPercent: Math.max(widthPercent, 1),
        startMs: videoStartMs,
        endMs: videoEndMs,
      };
    });

    // Group overlapping videos (videos that overlap by more than 50%)
    const groups: VideoGroup[] = [];
    const used = new Set<number>();

    for (let i = 0; i < videosWithPosition.length; i++) {
      if (used.has(i)) continue;

      const baseVideo = videosWithPosition[i];
      const overlapping: VideoWithPosition[] = [];

      for (let j = i + 1; j < videosWithPosition.length; j++) {
        if (used.has(j)) continue;

        const compareVideo = videosWithPosition[j];

        // Check if videos overlap significantly (within 30 seconds of each other's start)
        const timeDiff = Math.abs(baseVideo.startMs - compareVideo.startMs);
        if (timeDiff < 30000) { // 30 second threshold
          overlapping.push(compareVideo);
          used.add(j);
          if (overlapping.length >= 4) break; // Max 4 alternates
        }
      }

      used.add(i);

      // Calculate group bounds
      const allVideos = [baseVideo, ...overlapping];
      const groupStartMs = Math.min(...allVideos.map(v => v.startMs));
      const groupEndMs = Math.max(...allVideos.map(v => v.endMs));
      const groupPositionPercent = (groupStartMs / totalMs) * 100;
      const groupWidthPercent = ((groupEndMs - groupStartMs) / totalMs) * 100;

      groups.push({
        mainVideo: baseVideo,
        alternateVideos: overlapping.slice(0, 4),
        startMs: groupStartMs,
        endMs: groupEndMs,
        positionPercent: groupPositionPercent,
        widthPercent: Math.max(groupWidthPercent, 1),
      });
    }

    return { videoGroups: groups, totalDurationMs: totalMs, startTime: timelineStart };
  }, [concertData?.videos]);

  const currentGroup = videoGroups[currentGroupIndex];
  const selectedVideo = selectedVideoInGroup === 0
    ? currentGroup?.mainVideo
    : currentGroup?.alternateVideos[selectedVideoInGroup - 1];

  // Reset selected video in group when group changes
  useEffect(() => {
    setSelectedVideoInGroup(0);
  }, [currentGroupIndex]);

  // Update global progress based on current video playback
  useEffect(() => {
    if (!currentGroup || !totalDurationMs) return;

    const videoProgressMs = currentTime * 1000;
    const globalPositionMs = currentGroup.startMs + videoProgressMs;
    const progress = (globalPositionMs / totalDurationMs) * 100;
    setGlobalProgress(Math.min(progress, 100));
  }, [currentTime, currentGroup, totalDurationMs]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get all video refs (main + alternates)
  const getAllVideoRefs = useCallback(() => {
    const refs: HTMLVideoElement[] = [];
    if (mainVideoRef.current) refs.push(mainVideoRef.current);
    altVideoRefs.current.forEach(ref => {
      if (ref) refs.push(ref);
    });
    return refs;
  }, []);

  // Sync all videos to the same time
  const syncAllVideos = useCallback((time: number) => {
    getAllVideoRefs().forEach(video => {
      if (Math.abs(video.currentTime - time) > 0.5) {
        video.currentTime = time;
      }
    });
  }, [getAllVideoRefs]);

  // Play all videos
  const playAllVideos = useCallback(() => {
    getAllVideoRefs().forEach(video => {
      video.play().catch(() => { }); // Ignore autoplay errors
    });
  }, [getAllVideoRefs]);

  // Pause all videos
  const pauseAllVideos = useCallback(() => {
    getAllVideoRefs().forEach(video => {
      video.pause();
    });
  }, [getAllVideoRefs]);

  const togglePlayPause = () => {
    if (isPlaying) {
      pauseAllVideos();
      setIsPlaying(false);
    } else {
      playAllVideos();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (mainVideoRef.current) {
      const time = mainVideoRef.current.currentTime;
      setCurrentTime(time);
      // Keep alternates in sync
      syncAllVideos(time);
    }
  };

  const handleVideoEnded = () => {
    // Pause all videos first
    pauseAllVideos();
    // Auto-advance to next group
    if (currentGroupIndex < videoGroups.length - 1) {
      setCurrentGroupIndex(currentGroupIndex + 1);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  };

  // Auto-play all videos when group changes or when isPlaying becomes true
  useEffect(() => {
    if (isPlaying) {
      // Small delay to let refs update
      setTimeout(() => {
        playAllVideos();
      }, 100);
    }
  }, [currentGroupIndex, isPlaying, playAllVideos]);

  const handleSeekBarClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!seekBarRef.current || !totalDurationMs) return;

    const rect = seekBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPercent = (clickX / rect.width) * 100;
    const clickMs = (clickPercent / 100) * totalDurationMs;

    // Find which group this click falls into
    for (let i = 0; i < videoGroups.length; i++) {
      const group = videoGroups[i];
      if (clickMs >= group.startMs && clickMs < group.endMs) {
        setCurrentGroupIndex(i);
        const seekTime = (clickMs - group.startMs) / 1000;
        setTimeout(() => {
          syncAllVideos(seekTime);
        }, 100);
        return;
      }
    }

    // If clicked in a gap, find the nearest group
    let nearestIndex = 0;
    let minDistance = Infinity;
    videoGroups.forEach((group, i) => {
      const groupCenter = group.startMs + ((group.endMs - group.startMs) / 2);
      const distance = Math.abs(clickMs - groupCenter);
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    });
    setCurrentGroupIndex(nearestIndex);
  }, [videoGroups, totalDurationMs]);

  const goToPrevGroup = () => {
    if (currentGroupIndex > 0) {
      setCurrentGroupIndex(currentGroupIndex - 1);
    }
  };

  const goToNextGroup = () => {
    if (currentGroupIndex < videoGroups.length - 1) {
      setCurrentGroupIndex(currentGroupIndex + 1);
    }
  };

  const swapToAlternate = (altIndex: number) => {
    // Capture current playback state before swap
    const wasPlaying = isPlaying;
    const savedTime = mainVideoRef.current?.currentTime || currentTime;

    pauseAllVideos();
    setSelectedVideoInGroup(altIndex);

    // Restore time and playback after video element updates
    setTimeout(() => {
      if (mainVideoRef.current) {
        mainVideoRef.current.currentTime = savedTime;
      }
      syncAllVideos(savedTime);
      setTimeout(() => {
        if (wasPlaying) {
          playAllVideos();
        }
      }, 50);
    }, 100);
  };

  const handleSongSelect = (songId: number) => {
    // Find the first video associated with this song
    const videoIndex = videoGroups.findIndex((group) =>
      group.mainVideo.song_id === songId ||
      group.alternateVideos.some((v) => v.song_id === songId)
    );

    if (videoIndex !== -1) {
      setCurrentGroupIndex(videoIndex);
      setSetlistOpen(false);
      // Optionally restart playback
      setTimeout(() => {
        syncAllVideos(0);
        if (isPlaying) {
          playAllVideos();
        }
      }, 100);
    }
  };

  if (loading) {
    return (
      <PageContent title="watch" back={`/event/${eventId}`}>
        <div className="flex justify-center items-center py-8">
          <IonSpinner name="crescent" />
        </div>
      </PageContent>
    );
  }

  if (error || !concertData) {
    return (
      <PageContent title="watch" back={`/event/${eventId}`}>
        <div className="text-red-500 text-center py-4">
          {error || 'Concert not found'}
        </div>
      </PageContent>
    );
  }

  const { concert, videos } = concertData;

  if (videos.length === 0) {
    return (
      <PageContent title="watch" back={`/event/${eventId}`}>
        <div className="text-center py-8 text-muted-foreground">
          No videos available for this concert yet.
        </div>
      </PageContent>
    );
  }

  const hasAlternates = currentGroup && currentGroup.alternateVideos.length > 0;

  return (
    <PageContent title="watch" className='flex flex-col h-screen gap-0' hideMobileHeader noPadding back={`/event/${eventId}`}>

      {/* Concert Info */}
      {/* <div className="text-center">
          <h1 className="text-xl font-bold">{concert.artist_name}</h1>
          <p className="text-sm text-muted-foreground">
            {concert.venue_name} • {new Date(concert.concert_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div> */}

      {/* Video Player with Alternates */}
      {selectedVideo && currentGroup && (
        <div className="flex gap-2 h-[90vh] ">
          {/* Main Video (selected) */}
          <div className={`relative bg-black rounded-lg  ${hasAlternates ? 'flex-1' : 'w-full'} h-full`}>
            <video
              ref={mainVideoRef}
              key={`main-${currentGroupIndex}-${selectedVideoInGroup}`}
              src={selectedVideo.video_url}
              className="w-full h-full object-contain"
              playsInline
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={handleVideoEnded}
              onTimeUpdate={handleTimeUpdate}
            />

            {/* Play/Pause Overlay */}
            <button
              onClick={togglePlayPause}
              className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity group/overlay"
            >
              {/* Back button - top right */}
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  router.goBack();
                }}
                className="absolute top-4 left-4 size-8 rounded-full  backdrop-blur-sm bg-gray-500 hover:bg-gray-600! "
              >
                <ArrowLeft className="size-4 text-white" />
              </Button>
            </button>

          </div>

          {/* Alternate Videos Sidebar - all playing simultaneously */}
          {hasAlternates && (
            <div className="flex flex-col gap-2 w-28 z-0">
              {/* All videos in the group (except currently selected) */}
              {[currentGroup.mainVideo, ...currentGroup.alternateVideos].map((video, idx) => {
                if (idx === selectedVideoInGroup) return null; // Don't show currently selected

                const numAlternates = [currentGroup.mainVideo, ...currentGroup.alternateVideos].filter((_, i) => i !== selectedVideoInGroup).length;
                const heightVh = 90 / numAlternates;

                return (
                  <button
                    key={video.id}
                    onClick={() => swapToAlternate(idx)}
                    className="relative bg-zinc-800 rounded  border-2 border-transparent hover:border-chartreuse transition-all"
                    style={{ height: `${heightVh}vh` }}
                  >
                    <video
                      ref={el => { altVideoRefs.current[idx] = el; }}
                      src={video.video_url}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                      preload="auto"
                    />
                    {/* <div className="absolute bottom-0 left-0 right-0 bg-black/80 px-1 py-1">
                        <span className="text-xs truncate block font-medium">{video.username}</span>
                      </div> */}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Custom Seek Bar with Timeline */}
      <div className="bg-black rounded-lg flex-1 flex h-[10vh] flex-col justify-center z-30">
        {/* Seek Bar */}
        <div
          ref={seekBarRef}
          onClick={handleSeekBarClick}
          className="relative h-0.5 bg-gray-700 cursor-pointer group"
        >
          {/* Progress behind playhead */}
          <div
            className="absolute h-full bg-white transition-all"
            style={{ width: `${globalProgress}%` }}
          />

          {/* Video Group Segments with chartreuse for footage */}
          {videoGroups.map((group, index) => (
            <div
              key={group.mainVideo.id}
              className="absolute h-full transition-all"
              style={{
                left: `${group.positionPercent}%`,
                width: `${group.widthPercent}%`,
                minWidth: '2px',
              }}
            >
              {/* Chartreuse indicator for video footage */}
              <div className="absolute inset-0 bg-white/50" />
            </div>
          ))}

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-2 bg-chartreuse z-50 pointer-events-none"
            style={{ left: `${globalProgress}%` }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 ">
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPrevGroup}
              disabled={currentGroupIndex === 0}
              className="size-10 hover:bg-white/10 border-r rounded-none border-white"
            >
              <SkipBack className="size-5 fill-white" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlayPause}
              className="size-10 hover:bg-white/10 border-r rounded-none border-white"
            >
              {isPlaying ? (
                <Pause className="size-5 fill-white" />
              ) : (
                <Play className="size-5 fill-white" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNextGroup}
              disabled={currentGroupIndex === videoGroups.length - 1}
              className="size-10 hover:bg-white/10 disabled:opacity-30  border-r rounded-none border-white"
            >
              <SkipForward className="size-5 fill-white" />
            </Button>
          </div>
          <div className='w-full flex flex-col gap-1'>
            <p className="leading-none text-left pl-2 w-full">
              {selectedVideo?.song_title ? (
                <>
                  {selectedVideo.song_title} ● {concert.artist_name}
                </>
              ) : (
                <>
                  {concert.artist_name} ● {concert.venue_name} ● {new Date(concert.concert_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </>
              )}
            </p>
            <p className="leading-none text-left pl-2 w-full opacity-40 text-xs -mb-1 tabular-nums">
              {selectedVideo && new Date(new Date(selectedVideo.recorded_at).getTime() + currentTime * 1000).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </p>
          </div>
          
          {/* setlist */}
          <div className="flex items-center gap-1 ">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSetlistOpen(true)}
              className="size-10 hover:bg-white/10 border-l rounded-none border-white"
            >
              <List className="size-5 fill-white" />
            </Button>
          </div>
        </div>
      </div>

      {/* Setlist Sheet */}
      <Sheet open={setlistOpen} onOpenChange={setSetlistOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-background flex flex-col gap-0">
          <SheetHeader className='py-2'>
            <SheetTitle>Setlist</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto border-t p-2">
            {concertData?.setlist && concertData.setlist.length > 0 ? (
              <SetlistTable
                setlist={concertData.setlist}
                onSongClick={(songId) => {
                  // Check if this song has videos
                  const hasVideo = videoGroups.some((group) =>
                    group.mainVideo.song_id === songId ||
                    group.alternateVideos.some((v) => v.song_id === songId)
                  );
                  if (hasVideo) {
                    handleSongSelect(songId);
                  }
                }}
              />
            ) : (
              <div className="text-center text-muted-foreground py-4 h-full flex items-center justify-center">
                No setlist available
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </PageContent>
  );
};

export default Watch;
