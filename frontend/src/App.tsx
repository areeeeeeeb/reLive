import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { Route, Redirect } from 'react-router-dom';
import Tabs from './components/layout/tabs';
import { ThemeProvider } from './contexts/ThemeContext';
import { useAuth } from './contexts/AuthContext';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

// import '@ionic/react/css/normalize.css';  // commented out to prevent global button/input/form resets
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

// tailwind css (imported last to ensure utilities override Ionic styles)
import './theme/tailwind.css';

setupIonicReact();

const App: React.FC = () => {
  // get Auth0 authentication state
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <IonApp>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <div>Loading...</div>
        </div>
      </IonApp>
    );
  }

  return (
    <ThemeProvider>
      <IonApp>
        <IonReactRouter>
        {isAuthenticated ? (
          // protected routes - user is logged in
          <Tabs />
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
    </ThemeProvider>
  );
};

export default App;
