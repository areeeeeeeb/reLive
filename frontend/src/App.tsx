import { IonApp, IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { useState } from 'react';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';;
import { Route, Redirect } from 'react-router-dom';
import { home, search, person, cloudUpload } from 'ionicons/icons';
import Home from './pages/Home';
import Search from './pages/Search';
import UserProfile from './pages/Profile';
import Event from './pages/Event';
import Watch from './pages/Watch';
import Upload from './pages/Upload';
import Venue from './pages/Venue';
import Artist from './pages/Artist';

// tailwind css
import './theme/tailwind.css';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Theme variables */
import './theme/ionic.css';

setupIonicReact();

const App: React.FC = () => {
  // TODO: Replace with actual auth state management (Context, Redux, etc.)
  const [isAuthenticated] = useState(true);

  return (
    <IonApp>
      <IonReactRouter>
        {isAuthenticated ? (
          // protected routes - user is logged in
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
        ) : (
          // Public routes - user is not logged in
          <IonRouterOutlet>
            <Route exact path="/landing" component={Landing} />
            <Route exact path="/login" component={Login} />
            <Route exact path="/signup" component={Signup} />
            <Route exact path="/">
              <Redirect to="/landing" />
            </Route>
            {/* Catch-all redirect to landing if trying to access protected routes */}
            <Route>
              <Redirect to="/landing" />
            </Route>
          </IonRouterOutlet>
        )}
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
