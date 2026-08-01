import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function getOpenaiApiKey(): Promise<string> {
  let apiKey = process.env.OPENAI_API_KEY || '';
  if (!apiKey) {
    try {
      const docSnap = await getDoc(doc(db, 'settings', 'ai_config'));
      if (docSnap.exists()) {
        apiKey = docSnap.data().openai_api_key || '';
      }
    } catch (e) {
      console.error('Error fetching apiKey from Firestore settings/ai_config:', e);
    }
  }
  return apiKey;
}
