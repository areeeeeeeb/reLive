import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonAvatar, IonButton } from '@ionic/react';
import { useHistory } from 'react-router-dom';

const UserProfile: React.FC = () => {
  const history = useHistory();

  const handleLogout = () => {
    // TODO: Clear user session/token
    history.push('/landing');
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Profile</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Profile</IonTitle>
          </IonToolbar>
        </IonHeader>
        <div className="ion-text-center">
          <h2>User Name</h2>
          <p>user@example.com</p>
          <IonButton expand="block" color="danger" onClick={handleLogout}>
            Logout
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default UserProfile;
