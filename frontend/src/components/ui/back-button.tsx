import { IonBackButton, IonButton, IonButtons, IonIcon } from "@ionic/react";
import { arrowBack } from "ionicons/icons";
import { useState } from "react";
import { useIonRouter } from "@ionic/react";
import { useHistory } from "react-router-dom";
import { Capacitor } from "@capacitor/core";

interface BackButtonProps {
  defaultHref?: string;
  confirmBeforeBack?: boolean;
  children?: React.ReactNode;
  onBack?: () => void;
}

export const BackButton = ({
  defaultHref = "/home",
  confirmBeforeBack = false,
  children,
  onBack,
}: BackButtonProps) => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const ionRouter = useIonRouter();
  const history = useHistory();

  const handleBack = () => {
    const isAndroid = Capacitor.getPlatform() === 'android';

    if (confirmBeforeBack && !showConfirmDialog) {
      setShowConfirmDialog(true);
    } else if (onBack) {
      onBack();
    } else {
      // try to use Ionic router first, fall back to React Router
      try {
        // for android, use browser history to properly handle cross-tab navigation
        if (isAndroid) {
          if (typeof window !== 'undefined' && window.history.length > 1) {
            window.history.back();
          } else if (defaultHref) {
            ionRouter.push(defaultHref, 'back');
          }
        } else if (ionRouter?.canGoBack()) {
          ionRouter.goBack();
        } else if (ionRouter && defaultHref) {
          ionRouter.push(defaultHref, 'back');
        } else {
          // fallback to React Router
          if (typeof window !== 'undefined' && window.history.length > 1) {
            history.goBack();
          } else if (defaultHref) {
            history.push(defaultHref);
          }
        }
      } catch (error) {
        // if ionic router fails, use React Router with fallback to defaultHref
        if (typeof window !== 'undefined' && window.history.length > 1) {
          history.goBack();
        } else if (defaultHref) {
          history.push(defaultHref);
        }
      }
    }
  };

  // if children are provided, wrap them with click handler
  if (children) {
    return (
      <>
        <div onClick={handleBack} style={{ cursor: 'pointer' }}>
          {children}
        </div>
      </>
    );
  }

  return (
    <>
      <IonButtons class="-my-2 -mx-2">
        <IonButton onClick={() => handleBack()}>
          <IonIcon slot="icon-only" icon={arrowBack} />
        </IonButton>
      </IonButtons>
    </>
  );
};
