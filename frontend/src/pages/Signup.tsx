import { useIonRouter } from '@ionic/react';
import { PageContent } from '@/components/layout/page-content';
import { SignupForm } from '@/components/features/signup-form';

const Signup: React.FC = () => {
  const router = useIonRouter();
  const handleLoginSuccess = () => {
    // redirect to profile or home page after successful login
    router.push('/profile', 'root', 'replace');
  };

  return (
    <PageContent title='signup' className='flex items-center' hideMobileHeader>
      <div className="max-w-md w-full mx-auto h-fit ">
        <SignupForm onSuccess={handleLoginSuccess} />
      </div>
    </PageContent>
  );
};

export default Signup;
