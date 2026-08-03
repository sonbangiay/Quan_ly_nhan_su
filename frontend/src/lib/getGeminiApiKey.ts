import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export async function getGeminiApiKey(): Promise<string> {
  let apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey) {
    try {
      const docSnap = await getDoc(doc(db, 'settings', 'ai_config'));
      if (docSnap.exists()) {
        apiKey = docSnap.data().gemini_api_key || '';
      }
    } catch (e) {
      console.error('Error fetching apiKey from Firestore settings/ai_config:', e);
    }
  }
  return apiKey;
}

export async function saveGeminiApiKey(apiKey: string): Promise<void> {
  try {
    const docRef = doc(db, 'settings', 'ai_config');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      await updateDoc(docRef, { gemini_api_key: apiKey });
    } else {
      await setDoc(docRef, { gemini_api_key: apiKey });
    }
  } catch (e) {
    console.error('Error saving apiKey to Firestore:', e);
    throw e;
  }
}
