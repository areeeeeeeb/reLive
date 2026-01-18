import { IonTabs, IonTabBar, IonTabButton, IonRouterOutlet } from '@ionic/react';
import { Route, Redirect, useLocation, useHistory } from 'react-router-dom';
import { Home as HomeIcon, Search as SearchIcon, User as UserIcon, Upload as UploadIcon, Calendar as CalendarIcon } from 'lucide-react';
import { PlusCircleIcon } from '@phosphor-icons/react';
import { useRef } from 'react';
import Home from '../../pages/Home';
import Search from '../../pages/Search';
import UserProfile from '../../pages/Profile';
import Event from '../../pages/Event';
import Watch from '../../pages/Watch';
import Upload from '../../pages/Upload';
import Venue from '../../pages/Venue';
import Artist from '../../pages/Artist';
import { cn } from '@/lib/utils';
import { setPendingFiles } from '@/lib/uploadQueue';
import { Capacitor } from '@capacitor/core';

const Tabs: React.FC = () => {
  const location = useLocation();
  const history = useHistory();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Routes where tab bar should be hidden
  const hiddenTabBarRoutes = ['/upload', '/watch'];

  const isRouteActive = (href: string) => {
    return location.pathname === href;
  };

  const shouldHideTabBar = hiddenTabBarRoutes.some(route => 
    location.pathname === route || location.pathname.endsWith(route)
  );

  const handleUploadClick = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;

    if (files && files.length > 0) {
      // convert FileList to File array and store in upload queue
      const fileArray = Array.from(files);
      setPendingFiles(fileArray);
      // navigate to upload page
      history.push('/upload');
    }
    // reset the input so it can trigger onChange again for the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };


  return (
    <>
      {/* Hidden file input for video selection */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        multiple
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

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
            href={tab === 'upload' ? undefined : href}
            disabled={disabled}
            onClick={tab === 'upload' ? handleUploadClick : undefined}
          >
            <Icon
              size={24}
              id={id}
              strokeWidth={isRouteActive(href) ? 2 : 2}
              weight={important ? 'fill' : 'regular'}
              className={
                isRouteActive(href) ? 'text-white' : important ? 'text-chartreuse hover:text-chartreuse/80' : 'text-neutral-500'
              }
            />
          </IonTabButton>
        ))}
      </IonTabBar>
    </IonTabs>
    </>
  );
};

export default Tabs;
