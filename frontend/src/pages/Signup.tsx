import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Signup: React.FC = () => {
  const history = useHistory();
  const { login } = useAuth();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Sign Up</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <div style={{ marginTop: '20%', textAlign: 'center' }}>
          <h2>Create Your Account</h2>
          <p>Sign up with Auth0 to get started</p>
          <IonButton onClick={login}>Log in</IonButton>
          <IonButton expand="block" fill="clear" onClick={() => history.push('/login')}>
            Already have an account? Login
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Signup;
