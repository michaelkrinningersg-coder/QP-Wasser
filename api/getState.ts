import { list } from '@vercel/blob';

export default async function handler(req: any, res: any) {
  try {
    // Suche nach unserer Datei im Blob-Speicher
    const { blobs } = await list();
    const stateBlob = blobs.find(b => b.pathname === 'shared-state.json');

    if (!stateBlob) {
      return res.status(404).json({ error: 'Kein gespeicherter Stand gefunden' });
    }

    // Lade den Inhalt der Datei herunter und sende ihn ans Frontend
    const response = await fetch(stateBlob.url);
    const data = await response.json();

    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
