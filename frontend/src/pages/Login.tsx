import { IonButton } from '@ionic/react';
import { useAuth } from '../hooks/useAuth';
import { PageContent } from '@/components/layout/page-content';

const Login: React.FC = () => {
  const { login } = useAuth();

  return (
    <PageContent title='login'>
      <div>
        <h2>Welcome to reLive</h2>
        <p>Sign in to continue</p>
        <div>
          <IonButton onClick={login}>
            Log in
          </IonButton>
        </div>
      </div>
    </PageContent>
  );
};

export default Login;
