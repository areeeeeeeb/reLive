import { useParams } from 'react-router-dom';
import { PageContent } from '@/components/layout/page-content';

const Watch: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();

  return (
    <PageContent title="watch" back={`/event/${eventId}`}>
      <div>
        <h2>Watch Event {eventId}</h2>
        {/* TODO: Add video player and multi-angle viewing */}
        <p>Video player will be implemented here</p>
      </div>
    </PageContent>
  );
};

export default Watch;
