import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const ZALO_APP_ID = '3872938296996027660';
const ZALO_SECRET_KEY = 'v65u7m88vP35YcJ88P38';
const INITIAL_REFRESH_TOKEN = 'KdHv3vO7CHbTT7aAbmm-7rPwUGoL5LWU5XDiIgOcK0uyFNL2Z4bA2X9HRLsrOaK8C1OCJhOXFWyYDWmPcI0xJ1y5VJYeCLXH30TXBiyFOanlA5y8xYfgUbWEI3tx2MbMUNzN9RjG44W-UILPgtOBIo84I2UW6d9Z925L9wOrQ6OyDrLxgKDf2M9aJKtpV5a5C51vQVDGFIqsHNbxy3T55aWzVXwFI5rZEqKUTRrgDmStHmnbzLCu2rac1NRBNYSX2IrlOyiYB7DQ6H5bvIXDCr8DTsNj8589RXiQ7iqLFGrjE09vsIfACqzTN73uRKGNRs02LgXHHXukM0Hnx2eU9cPSF7BaBtyvNLb2A_rlTMCw5b0Nh0OGGX0_DIxM2YXcK188S9CrDpS15p1-tnaBQtmxBYDByq5n9PKREn8';

interface ZaloTokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number; // timestamp in ms
}

/**
 * Lấy Access Token. Nếu sắp hết hạn (còn < 1 tiếng) thì tự động lấy Token mới.
 */
export async function getZaloToken(): Promise<string> {
  const tokenRef = doc(db, 'settings', 'zalo_token');
  const tokenDoc = await getDoc(tokenRef);
  
  let tokenData: ZaloTokenData | null = null;
  
  if (tokenDoc.exists()) {
    tokenData = tokenDoc.data() as ZaloTokenData;
  }

  const now = Date.now();
  
  // Nếu chưa có token hoặc token đã/sắp hết hạn (Zalo token sống 25h, refresh nếu còn < 1h)
  if (!tokenData || !tokenData.access_token || now + 3600000 >= tokenData.expires_at) {
    const currentRefreshToken = tokenData?.refresh_token || INITIAL_REFRESH_TOKEN;
    console.log('Đang làm mới Zalo Access Token...');
    
    try {
      const response = await fetch('https://oauth.zaloapp.com/v4/oa/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'secret_key': ZALO_SECRET_KEY
        },
        body: new URLSearchParams({
          app_id: ZALO_APP_ID,
          refresh_token: currentRefreshToken,
          grant_type: 'refresh_token'
        })
      });

      const data = await response.json();

      if (data.access_token) {
        // Lưu token mới vào DB
        tokenData = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: now + (parseInt(data.expires_in) * 1000)
        };
        await setDoc(tokenRef, tokenData);
        console.log('Làm mới Zalo Token thành công!');
      } else {
        console.error('Lỗi khi lấy Zalo Token mới:', data);
        throw new Error('Failed to refresh Zalo token');
      }
    } catch (error) {
      console.error('Lỗi khi làm mới Zalo token:', error);
      throw error;
    }
  }

  return tokenData.access_token;
}

/**
 * Lấy thông tin người dùng từ Zalo (Tên, Avatar) - qua internal API route
 */
export async function getZaloProfile(userId: string) {
  try {
    // Gọi API Route nội bộ của Vercel - nó sẽ tự xử lý V3 và fallback proxy
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : 'https://hrm.nhanphuphuyen.edu.vn';
    
    const response = await fetch(`${baseUrl}/api/zalo/profile?user_id=${userId}`);
    const data = await response.json();
    
    if (data.error === 0) {
      return data.data; // { display_name, avatar, user_id, ... }
    }
    
    console.error('Lỗi lấy profile Zalo:', data);
    
    // Log error to Firestore to debug
    await setDoc(doc(db, 'debug_logs', `profile_${Date.now()}`), {
      action: 'getZaloProfile',
      userId: userId,
      error: data,
      createdAt: new Date().toISOString()
    });

    return null;
  } catch (error: any) {
    console.error('Lỗi gọi Zalo API getProfile:', error);
    await setDoc(doc(db, 'debug_logs', `profile_catch_${Date.now()}`), {
      action: 'getZaloProfile',
      error: error.message || 'Unknown',
      createdAt: new Date().toISOString()
    });
    return null;
  }
}

/**
 * Gửi tin nhắn text qua Zalo OA
 */
export async function sendZaloMessage(userId: string, text: string, imageUrl?: string) {
  try {
    const token = await getZaloToken();
    
    let messageBody: any = { text: text };
    
    if (imageUrl) {
      messageBody = {
        text: text,
        attachment: {
          type: "template",
          payload: {
            template_type: "media",
            elements: [
              {
                media_type: "image",
                url: imageUrl
              }
            ]
          }
        }
      };
    }

    const response = await fetch('https://openapi.zalo.me/v3.0/oa/message/cs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': token
      },
      body: JSON.stringify({
        recipient: { user_id: userId },
        message: messageBody
      })
    });
    
    const data = await response.json();
    if (data.error !== 0) {
      console.error('Zalo API gửi tin thất bại:', data);
      throw new Error(data.message || 'Zalo API Error');
    }
    return data;
  } catch (error) {
    console.error('Lỗi gọi Zalo API sendMessage:', error);
    throw error;
  }
}
