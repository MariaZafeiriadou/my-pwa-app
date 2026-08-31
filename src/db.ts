import Dexie, { type EntityTable } from 'dexie';

interface Track {
  id?: number;
  title: string;
  artist: string;
  cover: string;
  audioBlob: Blob; // Εδώ αποθηκεύεται το τραγούδι για offline χρήση
  isFavorite?: boolean;
  lyrics?: string;
}

const db = new Dexie('MusicEnterpriseDB') as Dexie & {
  tracks: EntityTable<Track, 'id'>;
};

db.version(2).stores({
  tracks: '++id, title, artist, isFavorite'
});

export { db };
export type { Track };

