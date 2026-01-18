import React, { useRef, useEffect, useCallback } from 'react';
import {
  IonPage,
  IonContent,
  IonRefresher,
  IonRefresherContent,
  RefresherCustomEvent,
} from '@ionic/react';
import MobileHeader, {
  MINIMAL_MOBILE_HEADER_PADDING_CLASS,
} from './mobile-header';
import { cn } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';
import { getTailwindColorValue as getColorValue} from '@/lib/utils';

interface PageLayoutProps {
  id?: string;
  title: string;
  children?: React.ReactNode;
  showDesktopHeader?: boolean;
  hideMobileHeader?: boolean;
  className?: string;
  containerClassName?: string;
  back?: boolean | string;
  hideIonPadding?: boolean;
  minimal?: boolean;
  confirmBeforeBack?: boolean;
  desktopHeaderVariant?: 'default' | 'sticky';
  bgColor?: string; // tailwind color class like 'slate-50' or 'white'
  refreshable?: boolean; // enable pull-to-refresh (default: true)
  onRefresh?: (event: RefresherCustomEvent) => void | Promise<void>;
  hintURL?: string; // optional URL for hint icon
  noPadding?: boolean; // disable desktop padding (md:p-10 lg:p-16)
}

export const PageContent = React.forwardRef<HTMLDivElement, PageLayoutProps>(
  (
    {
      id,
      title,
      children,
      showDesktopHeader = true,
      hideMobileHeader = false,
      hideIonPadding = false,
      containerClassName,
      className,
      back,
      minimal = false,
      confirmBeforeBack = false,
      desktopHeaderVariant = 'default',
      bgColor = 'white',
      refreshable = true,
      onRefresh,
      hintURL,
      noPadding = false,
    },
    ref,
  ) => {
    const contentRef = useRef<HTMLIonContentElement>(null);

    // set ion-content background color for iOS overscroll
    useEffect(() => {
      if (contentRef.current) {
        const hexColor = getColorValue(bgColor);
        contentRef.current.style.setProperty('--background', hexColor);
      }
    }, [bgColor]);

    // handle refresh - always fetch occupancies + optional page-specific refresh
    const handleRefresh = useCallback(
      async (event: RefresherCustomEvent) => {
        try {
          // call page-specific refresh if provided
          if (onRefresh) {
            await onRefresh(event);
          }
        } finally {
          event.detail.complete();
        }
      },
      [onRefresh],
    );

    return (
      <IonPage>
        {!hideMobileHeader && (
          <MobileHeader
            title={title}
            back={back}
            minimal={minimal}
            showOnDesktop={minimal && !showDesktopHeader}
            confirmBeforeBack={confirmBeforeBack}
            bgColor={bgColor}
            hintURL={hintURL}
          />
        )}
        <IonContent
          ref={contentRef}
          scrollEvents={desktopHeaderVariant === 'sticky'}
          className={cn(
            (hideIonPadding || noPadding) ? 'overflow-auto' : 'overflow-auto ion-padding',
            `bg-${bgColor}`,
          )}
        >
          {refreshable &&
            !confirmBeforeBack &&
            Capacitor.isNativePlatform() && (
              <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
                <IonRefresherContent />
              </IonRefresher>
            )}
          <div
            ref={ref}
            className={cn(
              'w-full justify-center flex min-h-full',
              containerClassName,
            )}
          >
            <div
              className={cn(
                !noPadding && 'md:p-10 lg:p-16',
                'w-full max-w-380 min-h-fit',
                !hideMobileHeader &&
                  minimal &&
                  MINIMAL_MOBILE_HEADER_PADDING_CLASS,
                className,
              )}
            >
              {(id && (
                <div id={id}>
                  {children}
                </div>
              )) || (
                <>
                  {children}
                </>
              )}
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  },
);

PageContent.displayName = 'PageContent';
