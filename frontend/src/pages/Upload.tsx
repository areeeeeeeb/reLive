import { useParams } from 'react-router-dom';
import { PageContent } from '@/components/layout/page-content';

const Upload: React.FC = () => {
  const { eventId } = useParams<{ eventId?: string }>();

  return (
    <PageContent
      title="upload"
      back={eventId ? `/event/${eventId}` : true}
    >
      <h2>Upload Your Event Video</h2>
    </PageContent>
  );
};

export default Upload;
