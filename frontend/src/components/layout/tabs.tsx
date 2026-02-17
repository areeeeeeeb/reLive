import { IonTabs, IonTabBar, IonRouterOutlet } from '@ionic/react';
import { Route, Redirect, useLocation } from 'react-router-dom';
import { Home as HomeIcon, Search as SearchIcon, User as UserIcon, Calendar as CalendarIcon } from 'lucide-react';
import Home from '../../pages/Home';
import Search from '../../pages/Search';
import UserProfile from '../../pages/Profile';
import Event from '../../pages/Event';
import Watch from '../../pages/Watch';
import Upload from '../../pages/Upload';
import Venue from '../../pages/Venue';
import Artist from '../../pages/Artist';
import { cn } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';
import UploadTabButton from '../features/upload-tab-button';
import TabButton from '../primitives/tab-button';

const Tabs: React.FC = () => {
  const location = useLocation();

  const isRouteActive = (href: string) => {
    return location.pathname === href;
  };

  // routes where tab bar should be hidden
  const hiddenTabBarRoutes = ['/upload', '/watch'];
  const shouldHideTabBar = hiddenTabBarRoutes.some(route =>
    location.pathname === route || location.pathname.endsWith(route)
  );

  return (
    <IonTabs className='bg-black'>
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

      <IonTabBar
        slot="bottom"
        id="tab-bar"
        mode='ios'
        className={cn(
          'pb-safe transition-all! duration-100!',
          shouldHideTabBar
            ? 'translate-y-full! h-0! border-0! pointer-events-none! opacity-0! [--ion-safe-area-bottom:0px]'
            : 'translate-y-0! opacity-100!',
          shouldHideTabBar && Capacitor.isNativePlatform()
            ? 'hidden'
            : '',
          'bg-black',
        )}
        style={
          {
            '--background': '#000000',
          } as any
        }
      >
        <TabButton
          tab="home"
          href="/home"
          icon={HomeIcon}
          isActive={isRouteActive('/home')}
        />
        <TabButton
          tab="search"
          href="/search"
          icon={SearchIcon}
          isActive={isRouteActive('/search')}
        />
        <UploadTabButton />
        <TabButton
          tab="calendar"
          href="/blah"
          icon={CalendarIcon}
          disabled
        />
        <TabButton
          tab="profile"
          href="/profile"
          icon={UserIcon}
          isActive={isRouteActive('/profile')}
        />
      </IonTabBar>
    </IonTabs>
  );
};

export default Tabs;
