import {  IonSpinner } from '@ionic/react';
import { useParams, useHistory } from 'react-router-dom';
import { PageContent } from '@/components/layout/page-content';
import { useEffect, useState } from 'react';
import { getConcertPage, ConcertPageResponse } from '@/lib/api/concerts';
import { Heart, Music, Play, Plus, Share, UsersRound, Video } from 'lucide-react';
import { Button } from '@/components/primitives/button';
import { SetlistTable } from '@/components/ui/setlist-table';

const Event: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const history = useHistory();
  const [concertData, setConcertData] = useState<ConcertPageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConcertData = async () => {
      if (!eventId) return;

      try {
        setLoading(true);
        const data = await getConcertPage(parseInt(eventId));
        setConcertData(data);
      } catch (err) {
        console.error('Error fetching concert data:', err);
        setError('Failed to load concert details');
      } finally {
        setLoading(false);
      }
    };

    fetchConcertData();
  }, [eventId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <PageContent title="event" back={true}>
        <div className="flex justify-center items-center py-8">
          <IonSpinner name="crescent" />
        </div>
      </PageContent>
    );
  }

  if (error || !concertData) {
    return (
      <PageContent title="event" back={true}>
        <div className="text-red-500 text-center py-4">
          {error || 'Concert not found'}
        </div>
      </PageContent>
    );
  }

  const { concert, videos, setlist, stats } = concertData;

  return (
    <PageContent title="event" back={true} bgColor='green-200'>
      <div className="flex flex-col gap-3">
        {/* Hero Section */}
        <div className="text-left w-full">
          <p className="text-2xl font-bold">{concert.artist_name}</p>
          {concert.tour_name && (
            <p className="text-md text-muted-foreground">{concert.tour_name}</p>
          )}
          <p className="text-lg text-chartreuse">
            {new Date(concert.concert_date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </p>
          <p className="text-md">{concert.venue_name}</p>
          <p className="text-sm text-muted-foreground">
            {concert.venue_city}
            {concert.venue_state && `, ${concert.venue_state}`}
          </p>
        </div>


        {/* stats */}
        <div className='flex gap-3 text-sm'>
          <div className='flex gap-1'> 
            <Video className='text-zinc-400 size-5' />
            <div>{stats.totalVideos} Videos</div>
          </div>
          <div className='flex gap-1'> 
            <Music className='text-zinc-400 size-5' />
            <div>{stats.totalSongs} Songs</div>
          </div>
          <div className='flex gap-1'> 
            <UsersRound className='text-zinc-400 size-5' />
            <div>{stats.attendees} Attendees</div>
          </div>
        </div>
        

        {/* action buttons */}
        <div className="flex gap-3 justify-between">

          <div className='flex flex-col'>
            <Button 
              variant='secondary' 
              className='rounded-full bg-neutral-400 hover:bg-neutral-300! size-16 flex  items-center justify-center'
              onClick={() => history.push(`/event/${eventId}/watch`)}
            >
              <Play className='size-10  text-black ' />
              
            </Button>
            <div className='text-center text-sm mt-1'>Watch</div>
          </div>

          <div className='flex flex-col'>
            <Button variant='secondary' className='rounded-full bg-neutral-400 hover:bg-neutral-300! size-16 flex  items-center justify-center'>
              <Plus className='size-10  text-black ' />
            </Button>
            <div className='text-center text-sm mt-1'>Upload</div>
          </div>

          <div className='flex flex-col'>
            <Button variant='secondary'className='rounded-full bg-neutral-400 hover:bg-neutral-300! size-16 flex  items-center justify-center'>
              <Heart className='size-10  text-black ' />
            </Button>
            <div className='text-center text-sm mt-1'>Like</div>
          </div>

          <div className='flex flex-col'>
            <Button variant='secondary' className='rounded-full bg-neutral-400 hover:bg-neutral-300! size-16 flex  items-center justify-center'>
              <Share className='size-10  text-black ' />
            </Button>
            <div className='text-center text-sm mt-1'>Share</div>
          </div>
        </div>

        {/* setlist */}
        <SetlistTable setlist={setlist} />

      </div>
    </PageContent>
  );
};

export default Event;
