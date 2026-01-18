import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';

interface SetlistSong {
  id: number;
  order_in_setlist: number;
  title: string;
  video_count: string;
}

interface SetlistTableProps {
  setlist: SetlistSong[];
}

export const SetlistTable: React.FC<SetlistTableProps> = ({ setlist }) => {
  if (setlist.length === 0) return null;

  return (
    <div className="rounded-lg">
      <p className="text-lg font-bold flex items-center gap-2">
        Setlist
      </p>
      <Table className=''>
        <TableBody className='bg-none'>
          {setlist.map((song) => (
            <TableRow key={song.id} className="border-zinc-800 hover:bg-opacity-0 border-b-0">
              <TableCell className="font-mono">
                {song.order_in_setlist}
              </TableCell>
              <TableCell className="">{song.title}</TableCell>
              <TableCell className="">
                {parseInt(song.video_count) > 0 && (
                  <span className="text-xs px-2 py-1 rounded">
                    {song.video_count} video{parseInt(song.video_count) !== 1 ? 's' : ''}
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
