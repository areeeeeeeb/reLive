import { IonToolbar, IonHeader, IonTitle } from '@ionic/react';
import { cn, getTailwindColorValue } from '@/lib/utils';
import { BackButton } from '../ui/back-button';
import { Capacitor } from '@capacitor/core';
import { QuestionIcon } from '@phosphor-icons/react';

export const MINIMAL_MOBILE_HEADER_HEIGHT = 56; // in pixels
export const MINIMAL_MOBILE_HEADER_PADDING_CLASS = ''; // Tailwind class for padding

interface MobileHeaderProps {
  title: string;
  back?: boolean | string;
  minimal?: boolean;
  showOnDesktop?: boolean;
  confirmBeforeBack?: boolean;
  bgColor?: string; // tailwind color class for minimal header background
  className?: string;
  onBack?: () => void;
  hintURL?: string;
}

const MobileHeader = ({
  title,
  back,
  minimal = false,
  showOnDesktop = false,
  confirmBeforeBack = false,
  bgColor = 'slate-50',
  hintURL,
  className,
  onBack,
}: MobileHeaderProps) => {
  const backgroundColor = minimal
    ? getTailwindColorValue(bgColor)
    : getTailwindColorValue('purple-100');

  return (
    <IonHeader
      class="ion-no-border"
      className={cn(
        !showOnDesktop && 'md:hidden',
      )}
    >
      <IonToolbar
        style={{
          '--background': backgroundColor,
        }}
        className={cn(
          'transition-all duration-300 h-14 flex flex-col justify-center',
          (Capacitor.getPlatform() === 'ios') && 'min-h-26',
          (Capacitor.getPlatform() === 'android') && 'min-h-20',
          !minimal && '',
          className
        )}
      >
        <div className="flex items-center w-full py-2.5 px-3 gap-2.5">
          {back && (
            <BackButton
              defaultHref={typeof back === 'string' ? back : '/home'}
              confirmBeforeBack={confirmBeforeBack}
              onBack={onBack}
            />
          )}
          {!minimal && (
            <p className="text-2xl font-medium leading-none">{title}</p>
          )}
          {hintURL && (
            <a
              href={hintURL}
              target="_blank"
              rel="noopener noreferrer"
              title='Understand Your Bill'
              className='ml-auto flex items-center justify-center'
              style={{
                marginRight: 'calc(var(--chat-button-height) + var(--chat-button-margin-horizontal))'
              }}
            >
              <QuestionIcon className="size-9 text-gray-400 hover:text-gray-500" weight="duotone" />
            </a>
          )}
        </div>
      </IonToolbar>
    </IonHeader>
  );
};

export default MobileHeader;