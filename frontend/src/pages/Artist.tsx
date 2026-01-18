import { useParams } from 'react-router-dom';
import { PageContent } from '@/components/layout/page-content';

const Artist: React.FC = () => {
  const { artistId } = useParams<{ artistId: string }>();

  return (
    <PageContent title="Artist" back={true}>
      <div>
        <h1>artist {artistId}</h1>
        {/* TODO: Add artist bio, upcoming events, past performances */}
        <p>Artist information and events will be displayed here</p>
      </div>
    </PageContent>
  );
};

export default Artist;
