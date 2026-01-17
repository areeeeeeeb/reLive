import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonInput, IonItem, IonLabel } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useState } from 'react';

const Signup: React.FC = () => {
  const history = useHistory();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSignup = () => {
    // TODO: Implement signup logic
    history.push('/home');
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Sign Up</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <div style={{ marginTop: '20%' }}>
          <IonItem>
            <IonLabel position="floating">Email</IonLabel>
            <IonInput type="email" value={email} onIonInput={(e) => setEmail(e.detail.value!)} />
          </IonItem>
          <IonItem>
            <IonLabel position="floating">Password</IonLabel>
            <IonInput type="password" value={password} onIonInput={(e) => setPassword(e.detail.value!)} />
          </IonItem>
          <IonItem>
            <IonLabel position="floating">Confirm Password</IonLabel>
            <IonInput type="password" value={confirmPassword} onIonInput={(e) => setConfirmPassword(e.detail.value!)} />
          </IonItem>
          <IonButton expand="block" onClick={handleSignup} style={{ marginTop: '20px' }}>
            Sign Up
          </IonButton>
          <IonButton expand="block" fill="clear" onClick={() => history.push('/login')}>
            Already have an account? Login
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Signup;
