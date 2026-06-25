import { NextRequest, NextResponse } from 'next/server';

// API Route này chạy trên máy chủ Vercel (Node.js runtime)
// Nhưng Zalo vẫn chặn IP Mỹ, nên chúng ta sẽ dùng PHP Proxy trên iNET VN

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');
  
  if (!userId) {
    return NextResponse.json({ error: -1, message: 'Missing user_id' }, { status: 400 });
  }

  try {
    // Lấy token từ Zalo
    const { getZaloToken } = await import('@/lib/zalo');
    const token = await getZaloToken();

    // Gọi trực tiếp Zalo V3 API từ server-side
    const zaloUrl = `https://openapi.zalo.me/v3.0/oa/user/detail?data=${encodeURIComponent(JSON.stringify({ user_id: userId }))}`;
    
    const response = await fetch(zaloUrl, {
      method: 'GET',
      headers: {
        'access_token': token
      }
    });
    
    const data = await response.json();
    
    if (data.error === 0) {
      return NextResponse.json(data);
    }

    // Nếu Vercel bị chặn IP, fallback sang PHP proxy VN
    if (data.error === -501) {
      const proxyUrl = `https://nhanphuphuyen.edu.vn/zalo_proxy.php?user_id=${userId}&token=${encodeURIComponent(token)}`;
      const proxyRes = await fetch(proxyUrl, { 
        signal: AbortSignal.timeout(8000)
      });
      const proxyData = await proxyRes.json();
      return NextResponse.json(proxyData);
    }
    
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: -1, message: error.message }, { status: 500 });
  }
}
