import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonBackButton, IonButtons, IonItem, IonLabel, IonTextarea, IonSelect, IonSelectOption } from '@ionic/react';
import { useParams } from 'react-router-dom';
import { useState } from 'react';

const Upload: React.FC = () => {
  const { eventId } = useParams<{ eventId?: string }>();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          {eventId && (
            <IonButtons slot="start">
              <IonBackButton defaultHref={`/event/${eventId}`} />
            </IonButtons>
          )}
          <IonTitle>Upload Video</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Upload</IonTitle>
          </IonToolbar>
        </IonHeader>
        <div>
          <h2>Upload Your Event Video</h2>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Upload;
