import { IonButton, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { useHistory } from 'react-router';

const Home: React.FC = () => {
  const history = useHistory();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Home</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Home</IonTitle>
          </IonToolbar>
        </IonHeader>
        <div>
          <h2>Discover Events</h2>
          {/* TODO: Add event list/feed */}
          <IonButton expand="block" color="danger" onClick={() => history.push('/event/1')}>
            concert 1
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Home;
