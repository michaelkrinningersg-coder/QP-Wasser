import { put } from '@vercel/blob';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Wir speichern die Daten als JSON-Datei namens "shared-state.json"
    // addRandomSuffix: false sorgt dafür, dass die Datei immer überschrieben wird
    const blob = await put('shared-state.json', JSON.stringify(req.body), {
      access: 'public',
      addRandomSuffix: false, 
    });

    return res.status(200).json({ message: 'Erfolgreich gespeichert', url: blob.url });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
