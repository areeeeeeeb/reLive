import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonRouterOutlet } from '@ionic/react';
import { Route, Redirect } from 'react-router-dom';
import { home, search, person, cloudUpload } from 'ionicons/icons';
import Home from '../pages/Home';
import Search from '../pages/Search';
import UserProfile from '../pages/Profile';
import Event from '../pages/Event';
import Watch from '../pages/Watch';
import Upload from '../pages/Upload';
import Venue from '../pages/Venue';
import Artist from '../pages/Artist';

const Tabs: React.FC = () => {
  return (
    <IonTabs>
      <IonRouterOutlet>
        {/* Tab roots */}
        <Route exact path="/home" component={Home} />
        <Route exact path="/search" component={Search} />
        <Route exact path="/upload" component={Upload} />
        <Route exact path="/profile" component={UserProfile} />

        {/* Shared routes - accessible from any tab */}
        <Route exact path="/event/:eventId" component={Event} />
        <Route exact path="/event/:eventId/watch" component={Watch} />
        <Route exact path="/event/:eventId/upload" component={Upload} />
        <Route exact path="/venue/:venueId" component={Venue} />
        <Route exact path="/artist/:artistId" component={Artist} />

        <Route exact path="/tabs">
          <Redirect to="/home" />
        </Route>
      </IonRouterOutlet>

      <IonTabBar slot="bottom" className='pb-safe'>
        <IonTabButton tab="home" href="/home">
          <IonIcon icon={home} />
          <IonLabel>Home</IonLabel>
        </IonTabButton>

        <IonTabButton tab="search" href="/search">
          <IonIcon icon={search} />
          <IonLabel>Search</IonLabel>
        </IonTabButton>

        <IonTabButton tab="upload" href="/upload">
          <IonIcon icon={cloudUpload} />
          <IonLabel>Upload</IonLabel>
        </IonTabButton>

        <IonTabButton tab="profile" href="/profile">
          <IonIcon icon={person} />
          <IonLabel>Profile</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>
  );
};

export default Tabs;
