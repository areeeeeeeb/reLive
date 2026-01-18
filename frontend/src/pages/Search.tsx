import { IonSearchbar } from '@ionic/react';
import { useState } from 'react';
import { PageContent } from '@/components/layout/page-content';

const Search: React.FC = () => {
  const [searchText, setSearchText] = useState('');

  return (
    <PageContent title="search">
      <IonSearchbar
        value={searchText}
        onIonInput={(e) => setSearchText(e.detail.value!)}
        placeholder="Search events, artists, venues..."
      />
      <div>
        {/* TODO: Add search results */}
      </div>
    </PageContent>
  );
};

export default Search;
