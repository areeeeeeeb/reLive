import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonInput, IonItem, IonLabel } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useState } from 'react';

const Login: React.FC = () => {
  const history = useHistory();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    // TODO: Implement login logic
    history.push('/home');
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Login</IonTitle>
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
          <IonButton expand="block" onClick={handleLogin} style={{ marginTop: '20px' }}>
            Login
          </IonButton>
          <IonButton expand="block" fill="clear" onClick={() => history.push('/signup')}>
            Don't have an account? Sign up
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Login;
