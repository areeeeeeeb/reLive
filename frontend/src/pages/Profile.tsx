import { IonAvatar, IonSpinner } from '@ionic/react';
import { useAuth0 } from '@auth0/auth0-react';
import { useAuth } from '../hooks/useAuth';
import { PageContent } from '@/components/layout/page-content';
import { useEffect, useState } from 'react';
import { getUserHome, UserHomeResponse } from '@/lib/api/users';
import EventCard from '@/components/EventCard';
import { Button } from '@/components/ui/button';
import { useHistory } from 'react-router-dom';
import { Video, Music, Users, Calendar } from 'lucide-react';

const UserProfile: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth0();
  const { logout, getUserId } = useAuth();
  const history = useHistory();
  const [homeData, setHomeData] = useState<UserHomeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHomeData = async () => {
      const userId = getUserId();
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
    <PageContent title={user?.name || 'Profile'} bgColor='black'>
      <div className="flex flex-col gap-4">
        {/* User Info */}
        <div className="flex items-center gap-4">
          <IonAvatar style={{ width: '80px', height: '80px' }}>
            <img
              src={user?.picture || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%2363b3ed'/%3E%3Cpath d='M50 45c7.5 0 13.64-6.14 13.64-13.64S57.5 17.72 50 17.72s-13.64 6.14-13.64 13.64S42.5 45 50 45zm0 6.82c-9.09 0-27.28 4.56-27.28 13.64v3.41c0 1.88 1.53 3.41 3.41 3.41h47.74c1.88 0 3.41-1.53 3.41-3.41v-3.41c0-9.08-18.19-13.64-27.28-13.64z' fill='%23fff'/%3E%3C/svg%3E`}
              alt={user?.name || 'User'}
            />
          </IonAvatar>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{user?.name}</h2>
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
            <div className='flex gap-1'>
              <Users className='text-zinc-400 size-5' />
              <div>{homeData.platformStats.total_users} Users</div>
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
