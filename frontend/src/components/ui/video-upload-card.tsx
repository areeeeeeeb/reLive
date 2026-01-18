"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Play } from "lucide-react";
import { useVideoGallery, UserVideo } from "@/hooks/useVideoGallery";
import { Spinner } from "@/components/ui/spinner";

interface VideoUploadCardProps {
  className?: string;
  triggerAnimation?: boolean;
  onAnimationComplete?: () => void;
}

interface VideoComponentProps {
  isAnimating: boolean;
  onAnimationComplete?: () => void;
  onRemove?: () => void;
  videoUrl?: string;
  index?: number;
  totalVideos?: number;
}

interface UploadCardBaseProps {
  children: React.ReactNode;
  className?: string;
  isDragOver?: boolean;
  isUploading?: boolean;
}

const VideoComponent = ({
  isAnimating,
  onAnimationComplete,
  onRemove,
  videoUrl,
  index = 0,
  totalVideos = 1,
}: VideoComponentProps) => {
  const [isRemoving, setIsRemoving] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Calculate dynamic height: (80 / totalVideos)vh with max of 20vh
  const videoHeight = Math.min(100 / totalVideos, 20);

  // Generate a random float offset for this video
  const floatOffset = useRef(Math.random() * 2 - 1); // Random value between -1 and 1

  // Update shouldShow when isAnimating changes
  useEffect(() => {
    if (isAnimating) {
      setShouldShow(true);
    }
  }, [isAnimating]);

  // Reset video loaded state when video URL changes
  useEffect(() => {
    if (videoUrl && videoRef.current) {
      setVideoLoaded(false);
      // Force the video to load
      videoRef.current.load();
    }
  }, [videoUrl]);

  // Don't render if we shouldn't show and we're not removing
  if (!shouldShow && !isRemoving) return null;

  const handleRemoveComplete = () => {
    setShouldShow(false);
    setIsRemoving(false);
    onRemove?.();
  };

  // Handle video loading
  const handleVideoLoadedData = () => {
    setVideoLoaded(true);
    if (videoRef.current) {
      // Pause immediately to show first frame
      videoRef.current.pause();
      // Set to a small time offset to show first frame
      videoRef.current.currentTime = 0.01;
    }
  };

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          className="absolute z-10"
          initial={{
            // Start way below the screen
            left: "50%",
            top: "calc(100vh + 300px)",
            x: "-50%",
            y: 0,
            opacity: 1,
          }}
          animate={
            isRemoving
              ? {
                scale: 0,
                opacity: 0,
                filter: "blur(8px)",
                transition: {
                  duration: 0.4,
                  ease: [0.23, 1, 0.32, 1],
                },
              }
              : {
                // Drop animation with zig-zag horizontal offset based on index
                left: `calc(50% + ${((index) % 2 === 0 ? -1 : 1) * 15}svw)`,
                top: `calc(50% + ${(index-1) * 18}svh)`,
                x: "-50%",
                y: "-50%",
                opacity: 1,
                transition: {
                  duration: 5,
                  ease: [0.55, 0.055, 0.675, 0.19],
                  delay: index * 0.1, // Stagger the drops
                },
              }
          }
          exit={{
            scale: 0,
            opacity: 0,
            filter: "blur(8px)",
            transition: {
              duration: 0.4,
              ease: [0.23, 1, 0.32, 1],
            },
          }}
          style={{
            transformOrigin: "center",
          }}
          onAnimationComplete={
            isRemoving ? handleRemoveComplete : onAnimationComplete
          }
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={
              isRemoving
                ? {
                  scale: 0,
                  transition: { duration: 0.4 },
                }
                : {
                  scale: 1.0,
                  y: [0, floatOffset.current * 10, 0], // Floating animation
                  transition: {
                    scale: {
                      type: "spring",
                      stiffness: 250,
                      damping: 15, // Less damping for more bounce on landing
                      mass: 1.2,
                      delay: 0.7, // Delay until the drop is almost complete
                    },
                    y: {
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 1.2, // Start floating after landing
                    },
                  },
                }
            }
            className="rounded-lg backdrop-blur-sm shadow-lg relative group w-full"
          >
            {/* Video Preview or Video Player */}
            <div className="relative flex items-center justify-center" style={{ height: `${videoHeight}vh` }}>
              {videoUrl ? (
                <div className="relative" style={{ width: `${videoHeight}vh`, height: `${videoHeight}vh` }}>
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    className="w-full h-full object-cover rounded-md shadow-md border-t border-l border-r border-border/30"
                    onLoadedData={handleVideoLoadedData}
                    onLoadedMetadata={handleVideoLoadedData}
                    controls={false}
                    muted
                    playsInline
                    preload="metadata"
                  />
                  {/* Loading overlay - shows until video loads */}
                  {!videoLoaded && (
                    <div className="absolute inset-0 bg-muted rounded-md flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full aspect-[21/9] from-primary/20 to-secondary/20 rounded-md flex items-center justify-center cursor-pointer hover:from-primary/30 hover:to-secondary/30 transition-colors duration-200">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center hover:bg-primary/40 transition-colors duration-200">
                    <Play size={28} className="text-primary ml-1" />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const UploadCardBase = ({
  children,
  className,
  isDragOver = false,
  isUploading = false,
}: UploadCardBaseProps) => {
  const hasChildren = React.Children.count(children) > 0;

  return (
    <div className="relative">
      {/* Background upload area - z-0 */}
      <div
        className={cn(
          "rounded-xl min-h-[80vh] flex items-center justify-center relative transition-colors duration-200 z-0",
          // Add cursor pointer when clickable and not uploading
          !isUploading && "cursor-pointer ",
          // Background color changes based on state
          isUploading
            ? "bg-primary/20"
            : isDragOver
              ? "bg-accent/40 shadow-inner"
              : "",
          className
        )}
      >
        {/* Content layer - above the background icon */}
        <div className="relative z-10 w-full">{children}</div>
      </div>

      {/* Dashed border overlay - z-20, sits above video component */}
      <div
        className={cn(
          "absolute inset-0 rounded-xl pointer-events-none z-20",
          isUploading
            ? "border-primary/60"
            : isDragOver
              ? "border-accent/80"
              : "border-border"
        )}
      />
    </div>
  );
};

export interface VideoUploadCardRef {
  triggerFileInput: () => void;
  openNativePicker: () => void;
  handleFileUpload: (file: File) => Promise<void>;
  clearVideos: () => void;
  getVideos: () => UserVideo[];
}

export const VideoUploadCard = React.forwardRef<
  VideoUploadCardRef,
  VideoUploadCardProps
>(({ className, triggerAnimation = false, onAnimationComplete }, ref) => {
  const { saveVideo, deleteVideo } = useVideoGallery();
  const [videos, setVideos] = useState<UserVideo[]>([]);
  const [animatingVideos, setAnimatingVideos] = useState<Set<string>>(new Set());
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Expose methods to parent via ref
  React.useImperativeHandle(ref, () => ({
    triggerFileInput: () => {
      fileInputRef.current?.click();
    },
    openNativePicker: () => {
      if (fileInputRef.current) {
        // Create and dispatch a synthetic touchstart event to simulate user interaction
        const touchEvent = new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true,
          view: window,
        });
        fileInputRef.current.dispatchEvent(touchEvent);

        // Small delay before clicking
        setTimeout(() => {
          fileInputRef.current?.click();
        }, 100);
      }
    },
    handleFileUpload: async (file: File) => {
      setIsUploading(true);
      try {
        const savedVideo = await saveVideo(file);

        // Add video to array
        setVideos(prev => [...prev, savedVideo]);

        // Trigger animation after a small delay to ensure video is in array
        setTimeout(() => {
          setIsUploading(false);
          setAnimatingVideos(prev => new Set([...prev, savedVideo.filepath]));
        }, 50);
      } catch (error) {
        console.error('Error saving video:', error);
        setIsUploading(false);
      }
    },
    clearVideos: () => {
      // Delete all videos from storage
      videos.forEach(video => deleteVideo(video));
      setVideos([]);
      setAnimatingVideos(new Set());
    },
    getVideos: () => {
      return videos;
    },
  }));

  useEffect(() => {
    if (triggerAnimation && videos.length > 0) {
      // Trigger animation for the last added video
      const lastVideo = videos[videos.length - 1];
      setAnimatingVideos(prev => new Set([...prev, lastVideo.filepath]));
    }
  }, [triggerAnimation, videos]);

  const handleAnimationComplete = (videoPath: string) => {
    // Remove from animating set when animation completes
    setAnimatingVideos(prev => {
      const newSet = new Set(prev);
      newSet.delete(videoPath);
      return newSet;
    });
    // Animation complete for this specific video
    onAnimationComplete?.();
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const videoFiles = files.filter((file) => file.type.startsWith("video/"));

    if (videoFiles.length > 0) {
      setIsUploading(true);

      try {
        // Save all videos
        const savedVideos = await Promise.all(
          videoFiles.map(file => saveVideo(file))
        );

        setVideos(prev => [...prev, ...savedVideos]);

        // Trigger animations for new videos
        setTimeout(() => {
          setIsUploading(false);
          savedVideos.forEach(video => {
            setAnimatingVideos(prev => new Set([...prev, video.filepath]));
          });
        }, 200);
      } catch (error) {
        console.error('Error saving video:', error);
        setIsUploading(false);
      }
    }
  }, [saveVideo]);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const videoFiles = Array.from(files).filter((file) => file.type.startsWith("video/"));

      if (videoFiles.length > 0) {
        setIsUploading(true);

        try {
          // Save all videos
          const savedVideos = await Promise.all(
            videoFiles.map(file => saveVideo(file))
          );

          setVideos(prev => [...prev, ...savedVideos]);

          // Trigger animations for new videos
          setTimeout(() => {
            setIsUploading(false);
            savedVideos.forEach(video => {
              setAnimatingVideos(prev => new Set([...prev, video.filepath]));
            });
          }, 200);
        } catch (error) {
          console.error('Error saving video:', error);
          setIsUploading(false);
        }
      }
    },
    [saveVideo]
  );

  const handleRemoveFile = useCallback(async (video: UserVideo) => {
    await deleteVideo(video);
    setVideos(prev => prev.filter(v => v.filepath !== video.filepath));
    setAnimatingVideos(prev => {
      const newSet = new Set(prev);
      newSet.delete(video.filepath);
      return newSet;
    });
    // Reset the file input so it can trigger onChange again for the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [deleteVideo]);

  const handleBaseClick = useCallback(() => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  }, [isUploading]);

  return (
    <div
      className={cn("relative w-full mx-auto", className)}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-xl text-center"
        )}
      >
        {/* Top masking area - z-30, covers video until it reaches upload area */}
        <div
          className="absolute top-0 left-0 right-0  pointer-events-none z-30"
          style={{
            height: '24px', // Covers area above upload zone

          }}
        />

        <div className="flex flex-col justify-center space-y-8">
          <div className="relative w-full mx-auto">
            <div
              className="relative"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleBaseClick}
            >
              <UploadCardBase
                isDragOver={isDragOver}
                isUploading={isUploading}
              >
                {/* Uploading Spinner Overlay */}
                {(isUploading || animatingVideos.size > 0) && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/50 backdrop-blur-sm rounded-xl">
                  <div className="flex flex-col items-center gap-3">
                    <Spinner className="size-12 opacity-50" />
                    <p className="text-sm text-muted-foreground">Processing uploads...</p>
                  </div>
                </div>
                )}
                
                {/* video Components */}
                {videos.map((video, index) => (
                  <VideoComponent
                    key={video.filepath}
                    isAnimating={animatingVideos.has(video.filepath)}
                    onAnimationComplete={() => handleAnimationComplete(video.filepath)}
                    onRemove={() => handleRemoveFile(video)}
                    videoUrl={video.webviewPath}
                    index={index}
                    totalVideos={videos.length}
                  />
                ))}
              </UploadCardBase>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

VideoUploadCard.displayName = 'VideoUploadCard';
