import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonBackButton, IonButtons } from '@ionic/react';
import { useParams } from 'react-router-dom';

const Venue: React.FC = () => {
  const { venueId } = useParams<{ venueId: string }>();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton />
          </IonButtons>
          <IonTitle>Venue</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <div>
          <h1>Venue {venueId}</h1>
          {/* TODO: Add venue details, location, past events */}
          <p>Venue information and past events will be displayed here</p>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Venue;
