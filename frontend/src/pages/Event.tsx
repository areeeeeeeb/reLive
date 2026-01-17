import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonBackButton, IonButtons } from '@ionic/react';
import { useParams, useHistory } from 'react-router-dom';

const Event: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const history = useHistory();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton />
          </IonButtons>
          <IonTitle>Event Details</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
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
      </IonContent>
    </IonPage>
  );
};

export default Event;
