import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonBackButton, IonButtons } from '@ionic/react';
import { useParams } from 'react-router-dom';

const Artist: React.FC = () => {
  const { artistId } = useParams<{ artistId: string }>();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton />
          </IonButtons>
          <IonTitle>Artist</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <div>
          <h1>Artist {artistId}</h1>
          {/* TODO: Add artist bio, upcoming events, past performances */}
          <p>Artist information and events will be displayed here</p>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Artist;
