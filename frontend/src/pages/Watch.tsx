import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonBackButton, IonButtons } from '@ionic/react';
import { useParams } from 'react-router-dom';

const Watch: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref={`/event/${eventId}`} />
          </IonButtons>
          <IonTitle>Watch</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <div>
          <h2>Watch Event {eventId}</h2>
          {/* TODO: Add video player and multi-angle viewing */}
          <p>Video player will be implemented here</p>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Watch;
