import { PageContent } from '@/components/layout/page-content';
import { IonButton } from '@ionic/react';
import { useHistory } from 'react-router-dom';

const Landing: React.FC = () => {
  const history = useHistory();

  return (
    <PageContent title='reLive'>
      <div className="ion-text-center" >
        <h1>Welcome to reLive</h1>
        <p>Experience events like never before</p>
        <IonButton expand="block" onClick={() => history.push('/login')}>
          Login
        </IonButton>
        <IonButton expand="block" fill="outline" onClick={() => history.push('/signup')}>
          Sign Up
        </IonButton>
      </div>
    </PageContent>
  );
};

export default Landing;
