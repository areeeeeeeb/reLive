import { useIonRouter } from '@ionic/react';
import { PageContent } from '@/components/layout/page-content';
import { LoginForm } from '@/components/features/login-form';

const Login: React.FC = () => {
  const router = useIonRouter();

  const handleLoginSuccess = () => {
    // redirect to profile or home page after successful login
    router.push('/profile', 'root', 'replace');
  };

  return (
    <PageContent title='login' className='flex items-center' hideMobileHeader>
      <div className="max-w-md w-full mx-auto h-fit ">
        <LoginForm onSuccess={handleLoginSuccess} />
      </div>
    </PageContent>
  );
};

export default Login;
