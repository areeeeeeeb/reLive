import { cn } from '@/lib/utils';
import { useEffect, useState, ReactNode } from 'react';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

interface FloatingFooterProps {
  children: ReactNode;
  isVisible?: boolean;
  className?: string;
}

export function FloatingFooter({
  children,
  isVisible = false,
  className,
}: FloatingFooterProps) {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // hide navigation behind keyboard when it appears (Android only)
  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;
    let showListener: any;
    let hideListener: any;
    const setupListeners = async () => {
      showListener = await Keyboard.addListener('keyboardWillShow', (info) => {
        setKeyboardHeight(info.keyboardHeight);
      });
      hideListener = await Keyboard.addListener('keyboardWillHide', () => {
        setKeyboardHeight(0);
      });
    };
    setupListeners();
    return () => {
      showListener?.remove();
      hideListener?.remove();
    };
  }, []);

  return (
    <div
      className={cn(
        "fixed z-40 bottom-0 left-0 right-0 py-10 bg-gradient-t from-black via-black/70 to-transparent transform transition-transform duration-300 ease-out pointer-events-none",
        Capacitor.isNativePlatform() && 'pb-[calc(0.5rem+var(--ion-safe-area-bottom))]',
        isVisible ? 'translate-y-0' : 'translate-y-full',
        className
      )}
      style={{
        transform: keyboardHeight > 0 ? `translateY(${keyboardHeight}px)` : undefined,
      }}
    >
      <div className="flex pointer-events-auto relative">
        {children}
      </div>
    </div>
  );
}
