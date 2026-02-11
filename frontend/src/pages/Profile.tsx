import { IonSpinner } from '@ionic/react';
import { useAuth } from '@/contexts/AuthContext';
import { PageContent } from '@/components/layout/page-content';
import { useEffect, useState } from 'react';
import { getUserHome, UserHomeResponse } from '@/lib/api/users';
import EventCard from '@/components/EventCard';
import { Button } from '@/components/ui/button';
import { useHistory } from 'react-router-dom';
import { Video, Music, Calendar } from 'lucide-react';

const UserProfile: React.FC = () => {
  const { user, isLoading: authLoading, logout } = useAuth();
  const history = useHistory();
  const [homeData, setHomeData] = useState<UserHomeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHomeData = async () => {
      const userId = user?.id;
      if (!userId) return;
      
      try {
        setLoading(true);
        const data = await getUserHome(userId);
        setHomeData(data);
      } catch (err) {
        console.error('Error fetching home data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchHomeData();
    } else if (!authLoading) {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (authLoading || loading) {
    return (
      <PageContent title="Profile" bgColor='black'>
        <div className="flex justify-center items-center py-8">
          <IonSpinner name="crescent" />
        </div>
      </PageContent>
    );
  }

  return (
    <PageContent title={user?.username || 'Profile'} bgColor='black'>
      <div className="flex flex-col gap-4">
        {/* User Info */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-chartreuse flex items-center justify-center text-black text-5xl">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{user?.display_name}</h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        {/* Platform Stats */}
        {homeData?.platformStats && (
          <div className='flex gap-3 text-sm flex-wrap'>
            <div className='flex gap-1'>
              <Video className='text-zinc-400 size-5' />
              <div>{homeData.platformStats.total_videos} Videos</div>
            </div>
            <div className='flex gap-1'>
              <Calendar className='text-zinc-400 size-5' />
              <div>{homeData.platformStats.total_concerts} Concerts</div>
            </div>
            <div className='flex gap-1'>
              <Music className='text-zinc-400 size-5' />
              <div>{homeData.platformStats.total_artists} Artists</div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {homeData?.recentActivity && homeData.recentActivity.length > 0 && (() => {
          // Group by concert_id to avoid duplicate cards
          const concertMap = new Map<number, any>();
          homeData.recentActivity.forEach((activity: any) => {
            if (!concertMap.has(activity.concert_id)) {
              concertMap.set(activity.concert_id, activity);
            }
          });
          const uniqueConcerts = Array.from(concertMap.values());

          return (
            <div>
              <h3 className="text-lg font-bold mb-3">Recent Activity</h3>
              <div className="flex flex-col gap-2">
                {uniqueConcerts.map((activity: any) => (
                  <div
                    key={activity.concert_id}
                    onClick={() => history.push(`/event/${activity.concert_id}`)}
                    className="cursor-pointer"
                  >
                    <EventCard
                      title={activity.artist_name}
                      date={formatDate(activity.concert_date)}
                      location={`${activity.venue_name}`}
                      imageUrl=""
                      imageAlt={activity.artist_name}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Logout Button */}
        <Button
          variant="outline"
          onClick={() => logout()}
          className="mt-4"
        >
          Log out
        </Button>
      </div>
    </PageContent>
  );
};

export default UserProfile;
