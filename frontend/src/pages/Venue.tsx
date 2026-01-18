import { useParams } from 'react-router-dom';
import { PageContent } from '@/components/layout/page-content';

const Venue: React.FC = () => {
  const { venueId } = useParams<{ venueId: string }>();

  return (
    <PageContent title="venue" back={true}>
      <div>
        <h1>Venue {venueId}</h1>
        {/* TODO: Add venue details, location, past events */}
        <p>Venue information and past events will be displayed here</p>
      </div>
    </PageContent>
  );
};

export default Venue;
