// Simple in-memory queue for files selected from the tab bar
let pendingFiles: File[] = [];
let shouldClearVideos = false;

export const setPendingFiles = (files: File[], clearExisting = true) => {
  pendingFiles = files;
  shouldClearVideos = clearExisting;
};

export const getPendingFiles = (): File[] => {
  return pendingFiles;
};

export const clearPendingFiles = () => {
  pendingFiles = [];
};

export const hasPendingFiles = (): boolean => {
  return pendingFiles.length > 0;
};

export const getShouldClearVideos = (): boolean => {
  return shouldClearVideos;
};

export const resetShouldClearVideos = () => {
  shouldClearVideos = false;
};
