import { IonTabs, IonTabBar, IonTabButton, IonRouterOutlet } from '@ionic/react';
import { Route, Redirect, useLocation } from 'react-router-dom';
import { Home as HomeIcon, Search as SearchIcon, User as UserIcon, Upload as UploadIcon, Calendar as CalendarIcon } from 'lucide-react';
import { PlusCircleIcon } from '@phosphor-icons/react';
import Home from '../../pages/Home';
import Search from '../../pages/Search';
import UserProfile from '../../pages/Profile';
import Event from '../../pages/Event';
import Watch from '../../pages/Watch';
import Upload from '../../pages/Upload';
import Venue from '../../pages/Venue';
import Artist from '../../pages/Artist';
import { cn } from '@/lib/utils';

const Tabs: React.FC = () => {
  const location = useLocation();

  const isRouteActive = (href: string) => {
    return location.pathname === href;
  };


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

      <IonTabBar
        slot="bottom"
        id="tab-bar"
        mode='ios'
        className={cn(
          'pb-safe transition-all! duration-100!',
          'translate-y-0z! opacity-100! border-gray-200',
          'bg-black',
        )}
                style={
          {
            '--background': '#000000',
          } as any
        }
      >
        {[
          {
            tab: 'home',
            href: '/home',
            Icon: HomeIcon,
            id: 'home-tab-button',
            disabled: false,
          },
          {
            tab: 'search',
            href: '/search',
            Icon: SearchIcon,
            id: 'search-tab-button',
            disabled: false,
          },
          {
            tab: 'upload',
            href: '/upload',
            Icon: PlusCircleIcon,
            important: true,
            id: 'upload-tab-button',
            disabled: false,
          },
          {
            tab: 'calendar',
            href: '/blah',
            Icon: CalendarIcon,
            id: 'calendar-tab-button',
            disabled: true,
          },
          {
            tab: 'profile',
            href: '/profile',
            Icon: UserIcon,
            id: 'profile-tab-button',
            disabled: false,
          },
        ].map(({ tab, href, Icon, id, disabled, important }) => (
          <IonTabButton
            key={tab}
            tab={tab}
            href={href}
            disabled={disabled}
          >
            <Icon
              size={24}
              id={id}
              strokeWidth={isRouteActive(href) ? 2 : 2}
              weight={important ? 'fill' : 'regular'}
              className={
                isRouteActive(href) ? 'text-white' : important ? 'text-neutral-500 hover:text-white' : 'text-neutral-500'
              }
            />
          </IonTabButton>
        ))}
      </IonTabBar>
    </IonTabs>
  );
};

export default Tabs;
