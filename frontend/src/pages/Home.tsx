import { PageContent } from '@/components/layout/page-content';
import { IonButton } from '@ionic/react';
import { useHistory } from 'react-router';

const Home: React.FC = () => {
  const history = useHistory();

  return (
    <PageContent title='home'>
      <h2>Discover Events</h2>
      {/* TODO: Add event list/feed */}
      <IonButton expand="block" color="danger" onClick={() => history.push('/event/1')}>
        concert 1
      </IonButton>
    </PageContent>
  );
};

export default Home;
