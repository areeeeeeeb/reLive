interface SetlistSong {
  id: number;
  order_in_setlist: number;
  title: string;
  video_count: string;
}

interface SetlistTableProps {
  setlist: SetlistSong[];
  onSongClick?: (songId: number) => void;
}

export const SetlistTable: React.FC<SetlistTableProps> = ({ setlist, onSongClick }) => {
  if (setlist.length === 0) return null;

  return (
    <div className="rounded-lg">
      <p className="text-lg font-bold flex items-center gap-2 mb-2">
        Setlist
      </p>
      <div className="flex flex-col gap-1">
        {setlist.map((song, index) => {
          const hasVideo = parseInt(song.video_count) > 0;
          const isClickable = hasVideo && onSongClick;

          return (
            <div
              key={song.id}
              onClick={() => isClickable && onSongClick(song.id)}
              className={`relative flex w-full items-center gap-3 rounded-sm py-1.5 px-2 text-sm outline-hidden select-none transition-colors ${
                isClickable
                  ? 'cursor-pointer hover:bg-accent/10 hover:text-accent-foreground focus:bg-accent/5'
                  : hasVideo
                  ? 'opacity-100'
                  : 'opacity-50'
              }`}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                hasVideo ? 'bg-primary/20 text-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {index + 1}
              </span>
              <span className="font-medium text-left flex-1">{song.title}</span>
              {hasVideo && (
                <span className="text-xs text-muted-foreground">
                  {song.video_count} video{parseInt(song.video_count) !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
