import { PageContent } from '@/components/layout/page-content';
import { IonSpinner } from '@ionic/react';
import { useHistory } from 'react-router';
import { useEffect, useState } from 'react';
import { getAllConcerts, Concert } from '@/lib/api/concerts';
import EventCard from '@/components/ui/event-card';

const Home: React.FC = () => {
  const history = useHistory();
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConcerts = async () => {
      try {
        setLoading(true);
        const response = await getAllConcerts();
        setConcerts(response.concerts);
      } catch (err) {
        console.error('Error fetching concerts:', err);
        setError('Failed to load concerts');
      } finally {
        setLoading(false);
      }
    };

    fetchConcerts();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatLocation = (concert: Concert) => {
    return `${concert.venue_name}`;
  };

  return (
    <PageContent title='home'>
      <h2 className="text-2xl font-bold mb-4">Discover Events</h2>

      {loading && (
        <div className="flex justify-center items-center py-8">
          <IonSpinner name="crescent" />
        </div>
      )}

      {error && (
        <div className="text-red-500 text-center py-4">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="flex flex-col gap-4">
          {concerts.map((concert) => (
            <div
              key={concert.id}
              onClick={() => history.push(`/event/${concert.id}`)}
              className="cursor-pointer"
            >
              <EventCard
                title={`${concert.artist_name}${concert.tour_name ? ` - ${concert.tour_name}` : ''}`}
                date={formatDate(concert.concert_date)}
                location={formatLocation(concert)}
                imageUrl={`https://via.placeholder.com/80x80?text=${encodeURIComponent(concert.artist_name.charAt(0))}`}
                imageAlt={`${concert.artist_name} concert`}
              />
            </div>
          ))}
        </div>
      )}

      {!loading && !error && concerts.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No concerts available
        </div>
      )}
    </PageContent>
  );
};

export default Home;
