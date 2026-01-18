import { IonButton } from '@ionic/react';
import { useParams, useHistory } from 'react-router-dom';
import { PageContent } from '@/components/layout/page-content';

const Event: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const history = useHistory();

  return (
    <PageContent title="event" back={true}>
      <div>
        <h1>Event {eventId}</h1>
        <p>Event information will go here</p>
        {/* TODO: Add event details, date, venue, artist */}

        <IonButton expand="block" onClick={() => history.push(`/event/${eventId}/watch`)}>
          Watch Videos
        </IonButton>
        <IonButton expand="block" fill="outline" onClick={() => history.push(`/event/${eventId}/upload`)}>
          Upload Your Video
        </IonButton>
      </div>
    </PageContent>
  );
};

export default Event;
