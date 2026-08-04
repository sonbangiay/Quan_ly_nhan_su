'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Upload, Play, Video, Download, X, Settings2, Trash2 } from 'lucide-react';

interface CardData {
  id: string;
  image: string; // base64 or URL
  kanji: string;
  romaji: string;
  hiragana: string;
  meaning: string;
}

// Initial cards mapping to the screenshot provided by user
const INITIAL_CARDS: CardData[] = [
  { id: '1', image: '', kanji: 'Onegai Kao', romaji: 'Mặt nài nỉ', hiragana: 'おねがいかお', meaning: 'Mặt nài nỉ' },
  { id: '2', image: '', kanji: 'Ikari', romaji: 'Nổi giận', hiragana: 'いかり', meaning: 'Nổi giận' },
  { id: '3', image: '', kanji: 'Zekkyou', romaji: 'Hét lên vì sợ hãi', hiragana: 'ぜっきょう', meaning: 'Hét lên vì sợ hãi' },
  { id: '4', image: '', kanji: 'Kunou', romaji: 'Dằn vặt', hiragana: 'くのう', meaning: 'Dằn vặt' },
  { id: '5', image: '', kanji: 'Osore', romaji: 'Sợ hãi', hiragana: 'おそれ', meaning: 'Sợ hãi' },
  { id: '6', image: '', kanji: 'Ando no Namida', romaji: 'Nước mắt nhẹ nhõm', hiragana: 'あんどのなみだ', meaning: 'Nước mắt nhẹ nhõm' },
  { id: '7', image: '', kanji: 'Kandou', romaji: 'Xúc động', hiragana: 'かんどう', meaning: 'Xúc động' },
  { id: '8', image: '', kanji: 'Atsusa de Bateru', romaji: 'Đuối sức vì nóng', hiragana: 'あつさでバテる', meaning: 'Đuối sức' },
  { id: '9', image: '', kanji: 'Kanjou', romaji: 'Cảm xúc', hiragana: 'かんじょう', meaning: 'Cảm xúc' },
];

export default function VocabVideoGenerator() {
  const [cards, setCards] = useState<CardData[]>(INITIAL_CARDS);
  const [numCards, setNumCards] = useState<number>(9); // 2, 4, 6, 9
  const [bgColor, setBgColor] = useState<string>('#90C9F9');
  const [bgImage, setBgImage] = useState<string | null>(null);
  
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [showRecordModal, setShowRecordModal] = useState(false);
  
  const previewRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isRecordingRef = useRef<boolean>(false);
  
  // Refs cho hệ thống âm thanh kỹ thuật số (Direct Audio Injection)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  // Adjust cards array size when numCards changes
  useEffect(() => {
    if (cards.length < numCards) {
      const newCards = [...cards];
      for (let i = cards.length; i < numCards; i++) {
        newCards.push({
          id: Date.now().toString() + i,
          image: '', kanji: '', romaji: '', hiragana: '', meaning: ''
        });
      }
      setCards(newCards);
    } else if (cards.length > numCards) {
      setCards(cards.slice(0, numCards));
    }
  }, [numCards, cards]);

  const handleImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newCards = [...cards];
        newCards[index].image = reader.result as string;
        setCards(newCards);
      };
      reader.readAsDataURL(file);
    }
  };

  // Kỹ thuật số hoá âm thanh (Không cần thu âm từ loa nữa)
  const speakTextDigital = async (text: string, isStudent: boolean = false): Promise<void> => {
    if (!audioCtxRef.current || !audioDestRef.current) return;
    const ctx = audioCtxRef.current;
    const dest = audioDestRef.current;

    try {
      const gtts = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ja&q=${encodeURIComponent(text)}`;
      // Sử dụng proxy để vượt rào CORS và tải trực tiếp file MP3
      let proxy = `https://corsproxy.io/?url=${encodeURIComponent(gtts)}`;
      
      let res = await fetch(proxy);
      if (!res.ok) {
        proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(gtts)}`;
        res = await fetch(proxy);
      }
      
      if (!res.ok) throw new Error("Không tải được âm thanh");
      
      const arrayBuffer = await res.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      
      return new Promise<void>((resolve) => {
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        
        if (isStudent) {
          // Giọng học sinh: Nâng cao vút và tăng tốc một xíu để phân biệt rõ với giáo viên
          source.playbackRate.value = 1.18; 
        }
        
        // 1. Nối vào luồng ghi hình (Trực tiếp vào Video)
        source.connect(dest);
        // 2. Nối ra loa ngoài (Để bạn nghe được)
        source.connect(ctx.destination);
        
        source.onended = () => {
          setTimeout(resolve, 400); // Khoảng lặng
        };
        
        source.start();
      });
    } catch (err) {
      console.error("Lỗi tạo âm thanh kỹ thuật số", err);
      await new Promise(r => setTimeout(r, 1500)); // Nghỉ một chút nếu lỗi để video không chạy quá nhanh
    }
  };

  const playSequence = async () => {
    for (let i = 0; i < cards.length; i++) {
      setActiveHighlight(cards[i].id);
      const cardText = cards[i].hiragana || cards[i].kanji || cards[i].romaji;
      if (cardText) {
        await speakTextDigital(cardText, false); // Cô giáo đọc chuẩn
        await speakTextDigital(cardText, true);  // Học sinh lặp lại giọng trẻ
      }
    }
    setActiveHighlight(null);
  };

  const setupCanvasCrop = (originalStream: MediaStream): MediaStream => {
    const hiddenVideo = document.createElement('video');
    hiddenVideo.srcObject = originalStream;
    hiddenVideo.muted = true;
    hiddenVideo.playsInline = true;
    hiddenVideo.play();

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const outW = 720;
    const outH = 1280;
    canvas.width = outW;
    canvas.height = outH;

    const drawLoop = () => {
      if (!isRecordingRef.current) return;
      if (hiddenVideo.videoWidth > 0 && previewRef.current) {
          const rect = previewRef.current.getBoundingClientRect();
          const scaleX = hiddenVideo.videoWidth / window.innerWidth;
          const scaleY = hiddenVideo.videoHeight / window.innerHeight;
          const sX = rect.x * scaleX;
          const sY = rect.y * scaleY;
          const sW = rect.width * scaleX;
          const sH = rect.height * scaleY;
          ctx?.drawImage(hiddenVideo, sX, sY, sW, sH, 0, 0, outW, outH);
      }
      requestAnimationFrame(drawLoop);
    };
    drawLoop();
    return canvas.captureStream(30);
  };

  const startActualRecording = async () => {
    setShowRecordModal(false);
    
    try {
      setVideoUrl(null);

      // 1. Khởi tạo Kênh Âm Thanh Kỹ Thuật Số (Digital Audio Context)
      if (!audioCtxRef.current) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioContext();
        audioDestRef.current = audioCtxRef.current.createMediaStreamDestination();
      }
      if (audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume();
      }

      // 2. CHỈ yêu cầu hình ảnh của "Tab Chrome" (Không quan tâm âm thanh nữa vì đã có kỹ thuật số)
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser' }, 
        audio: false, // Bỏ qua chia sẻ âm thanh, ngăn chặn 100% rủi ro người dùng quên bật
        // @ts-ignore
        preferCurrentTab: true
      });

      const videoTrack = stream.getVideoTracks()[0];
      let finalVideoStream = new MediaStream([videoTrack]);

      setIsRecording(true);
      isRecordingRef.current = true;

      // 3. Tự động cắt chuẩn 9:16 bằng Region Capture API siêu nét (hoặc Canvas fallback)
      if ('CropTarget' in window && previewRef.current) {
        try {
          // @ts-ignore
          const cropTarget = await window.CropTarget.fromElement(previewRef.current);
          // @ts-ignore
          await videoTrack.cropTo(cropTarget);
        } catch (e) {
          console.warn("Region crop failed, fallback to Canvas", e);
          finalVideoStream = setupCanvasCrop(stream);
        }
      } else {
        finalVideoStream = setupCanvasCrop(stream);
      }

      // 4. Trộn Video hoàn hảo + Âm thanh Kỹ thuật số hoàn hảo!
      const combinedStream = new MediaStream([
        ...finalVideoStream.getVideoTracks(),
        ...audioDestRef.current!.stream.getAudioTracks()
      ]);

      const options = { mimeType: 'video/webm;codecs=vp8,opus' };
      let mediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(combinedStream, options);
      } catch (e) {
        mediaRecorder = new MediaRecorder(combinedStream);
      }
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        
        stream.getTracks().forEach(track => track.stop());
        finalVideoStream.getTracks().forEach(track => track.stop());
        combinedStream.getTracks().forEach(track => track.stop());
        
        setIsRecording(false);
        isRecordingRef.current = false;
      };

      mediaRecorder.start();

      setTimeout(async () => {
        await playSequence();
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      }, 1000);

    } catch (err) {
      console.error('Error starting recording:', err);
      setIsRecording(false);
      isRecordingRef.current = false;
    }
  };

  // Determine grid template based on numCards
  const getGridTemplate = () => {
    if (numCards === 2) return { gridTemplateColumns: 'repeat(1, 1fr)', gridTemplateRows: 'repeat(2, 1fr)' };
    if (numCards === 4) return { gridTemplateColumns: 'repeat(2, 1fr)', gridTemplateRows: 'repeat(2, 1fr)' };
    if (numCards === 6) return { gridTemplateColumns: 'repeat(2, 1fr)', gridTemplateRows: 'repeat(3, 1fr)' };
    // Default 9
    return { gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)' };
  };

  return (
    <div className="p-6 h-screen flex flex-col bg-[var(--bg-secondary)] overflow-hidden">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Video className="text-[var(--accent-purple)]" /> Tạo Video Từ Vựng (TikTok/Shorts)
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            Nhập liệu, chọn số lượng từ, và quay video trực tiếp bằng công nghệ Screen Capture
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={playSequence}
            disabled={isRecording}
            className="btn btn-outline flex items-center gap-2 px-4 py-2"
          >
            <Play size={18} /> Nghe thử Audio
          </button>
          <button 
            onClick={() => setShowRecordModal(true)}
            disabled={isRecording}
            className="btn btn-primary flex items-center gap-2 px-4 py-2 bg-[var(--accent-purple)] text-white border-none relative"
          >
            {isRecording ? <span className="spinner w-4 h-4" /> : <Video size={18} />}
            {isRecording ? 'Đang quay...' : 'Bắt đầu quay Video'}
            
            {/* Vòng tròn nhấp nháy báo đang quay (chuyển sang nằm trên nút để tránh bị dính vào video) */}
            {isRecording && <span className="absolute -top-2 -right-2 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white"></span>
            </span>}
          </button>
        </div>
      </div>

      {/* Main layout: left inputs, right preview */}
      <div className="flex gap-8 flex-1 min-h-0">
        
        {/* Left: Input Form */}
        <div className="flex-1 bg-[var(--bg-primary)] p-5 rounded-xl border border-[var(--border)] overflow-y-auto">
          
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Settings2 size={18} /> Cấu hình Nội dung
            </h2>
            <div className="flex items-center gap-2 bg-[var(--bg-hover)] p-1.5 rounded-lg border border-[var(--border)]">
              <span className="text-sm font-medium px-2">Số ô từ vựng:</span>
              {[2, 4, 6, 9].map(num => (
                <button 
                  key={num}
                  onClick={() => setNumCards(num)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${numCards === num ? 'bg-[var(--accent-purple)] text-white shadow' : 'text-[var(--text-secondary)] hover:bg-[var(--border)]'}`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between mb-4 mt-4">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Settings2 size={18} /> Giao diện nền
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-[var(--border)]">
            <div>
              <label className="block text-xs font-semibold mb-1 text-[var(--text-muted)]">Màu nền</label>
              <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-full h-10 rounded cursor-pointer border border-[var(--border)]" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-[var(--text-muted)]">Ảnh nền</label>
              <label className="w-full h-10 border border-[var(--border)] rounded flex items-center justify-center cursor-pointer hover:bg-[var(--bg-hover)] overflow-hidden bg-white">
                <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setBgImage(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }} />
                {bgImage ? <span className="text-xs font-bold text-green-600">Đã tải ảnh nền</span> : <span className="text-xs text-[var(--text-muted)]">Tải lên ảnh</span>}
              </label>
              {bgImage && <button onClick={() => setBgImage(null)} className="text-xs text-red-500 mt-1 hover:underline text-center w-full">Xoá ảnh nền</button>}
            </div>
          </div>

          <div className="space-y-6">
            {/* Cards Input */}
            <div className="grid grid-cols-2 gap-4">
              {cards.map((card, idx) => (
                <div key={card.id} className="p-4 rounded-lg bg-white border border-[var(--border)] shadow-sm">
                  <div className="font-bold text-sm mb-3 flex items-center justify-between border-b border-[var(--border)] pb-2">
                    <span>Ô từ vựng #{idx + 1}</span>
                  </div>
                  <div className="grid grid-cols-[80px_1fr] gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold mb-1 text-[var(--text-muted)] uppercase">Emoji/Ảnh</label>
                      <label className="w-full h-20 border-2 border-dashed border-[var(--border)] rounded flex flex-col items-center justify-center cursor-pointer hover:bg-[var(--bg-hover)] overflow-hidden">
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(idx, e)} />
                        {card.image ? (
                          <img src={card.image} alt="Card" className="w-full h-full object-contain" />
                        ) : (
                          <Upload size={16} className="text-[var(--text-muted)]" />
                        )}
                      </label>
                    </div>
                    <div className="space-y-2">
                      <input type="text" className="input text-xs w-full py-1.5 font-bold" value={card.romaji} onChange={e => {
                        const newCards = [...cards]; newCards[idx].romaji = e.target.value; setCards(newCards);
                      }} placeholder="Romaji (Mặt nài nỉ)" />
                      <input type="text" className="input text-xs w-full py-1.5 font-bold text-red-600" value={card.hiragana} onChange={e => {
                        const newCards = [...cards]; newCards[idx].hiragana = e.target.value; setCards(newCards);
                      }} placeholder="Hiragana (おねがいかお)" />
                      <input type="text" className="input text-xs w-full py-1.5" value={card.meaning} onChange={e => {
                        const newCards = [...cards]; newCards[idx].meaning = e.target.value; setCards(newCards);
                      }} placeholder="Nghĩa (Mặt nài nỉ)" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* Right: Video Preview */}
        {/* Layout bình thường, khi quay không bị giật lag */}
        <div className="w-[450px] shrink-0 bg-[var(--bg-primary)] p-4 rounded-xl border border-[var(--border)] flex flex-col items-center justify-center relative">

          {/* The Actual Video Frame Container (9:16 aspect ratio) */}
          <div 
            ref={previewRef}
            className="relative overflow-hidden flex flex-col items-center shadow-2xl transition-all duration-300"
            style={{ 
              width: '100%', 
              aspectRatio: '9/16',
              borderRadius: isRecording ? 0 : 24, 
              boxShadow: isRecording ? 'none' : '0 10px 30px rgba(0,0,0,0.1)',
              backgroundColor: bgColor,
              backgroundImage: bgImage ? `url(${bgImage})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            {/* Header / Logo space */}
            <div className="pt-10 pb-6 w-full flex items-center justify-center shrink-0 z-10 relative">
              <h2 className="text-[28px] font-black text-[#FFD700] flex items-center" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.6)' }}>
                Du học Nhân Phú
              </h2>
            </div>

            {/* Dynamic Grid Container */}
            <div 
              className="flex-1 w-full p-4 grid gap-4 transition-all duration-500"
              style={{
                ...getGridTemplate(),
                paddingBottom: 32 // Some extra padding at the bottom for aesthetics
              }}
            >
              {/* Cards */}
              {cards.map((card, idx) => (
                <div 
                  key={card.id}
                  className={`bg-white rounded-3xl shadow-md flex flex-col items-center justify-center p-3 text-center transition-all duration-300 ${activeHighlight === card.id ? 'ring-[6px] ring-yellow-400 scale-[1.02]' : ''}`}
                >
                  <div className="flex-1 min-h-[4rem] w-full flex items-center justify-center mb-2">
                    {card.image ? (
                      <img src={card.image} alt="" className="max-w-full max-h-[80px] md:max-h-[140px] object-contain drop-shadow-sm" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-xs text-gray-300 border border-dashed border-gray-200">Ảnh</div>
                    )}
                  </div>
                  
                  <div className="shrink-0 w-full flex flex-col items-center gap-1">
                    <div className="text-[12px] font-bold text-gray-800 leading-tight">{card.romaji}</div>
                    
                    {/* Scale text dynamically based on grid size for better readability */}
                    <div className={`font-black text-red-600 leading-none ${numCards <= 4 ? 'text-2xl' : 'text-lg'}`}>
                      {card.hiragana}
                    </div>
                    
                    <div className={`text-gray-600 leading-tight ${numCards <= 4 ? 'text-sm' : 'text-[11px]'}`}>
                      {card.meaning}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Record Instruction Modal */}
      {showRecordModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in duration-200 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4 border-b pb-3 flex items-center gap-2">
              <Video className="text-[var(--accent-purple)]" /> Chuẩn bị quay video
            </h3>
            
            <div className="space-y-4 mb-6">
              <p className="text-gray-700 font-medium text-[15px]">Hệ thống đã được nâng cấp <strong>Tự động hoá 100%</strong> cực kỳ xịn xò.</p>
              
              <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 shadow-inner">
                <p className="text-[15px] text-blue-900 font-semibold mb-2">Bạn chỉ cần thực hiện 2 thao tác cực dễ:</p>
                <ol className="list-decimal list-inside space-y-2 text-[15px] text-blue-800 ml-1">
                  <li>Chọn mục <strong>"Tab Chrome"</strong>.</li>
                  <li>Bấm nút <strong>"Chia sẻ"</strong> là xong!</li>
                </ol>
              </div>
              
              <p className="text-[13.5px] text-green-700 font-semibold bg-green-50 p-3 rounded-xl border border-green-200 flex items-start gap-2">
                <span>✨</span> Hệ thống sẽ tự động ghép âm thanh kỹ thuật số sắc nét và tự động cắt chuẩn khung video Tiktok cho bạn.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowRecordModal(false)} className="px-5 py-2.5 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition-colors">Hủy</button>
              <button onClick={startActualRecording} className="px-6 py-2.5 bg-[var(--accent-purple)] text-white font-bold rounded-xl hover:opacity-90 shadow-lg shadow-purple-500/30 transition-transform active:scale-95 flex items-center gap-2">
                Bắt đầu luôn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Result Modal */}
      {videoUrl && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 flex flex-col items-center max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <div className="w-full flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Video đã tạo thành công! 🎉</h3>
              <button onClick={() => setVideoUrl(null)} className="p-1 hover:bg-gray-100 rounded-full text-gray-500">
                <X size={20} />
              </button>
            </div>
            
            <video src={videoUrl} controls autoPlay className="w-full max-w-[280px] rounded-xl shadow-lg border border-gray-200 mb-6" />
            
            <div className="flex gap-3 w-full">
              <button onClick={() => setVideoUrl(null)} className="btn btn-outline flex-1">
                Đóng
              </button>
              <a 
                href={videoUrl} 
                download={`Tu-Vung-${Date.now()}.webm`}
                className="btn btn-primary flex-1 bg-green-500 hover:bg-green-600 text-white border-none flex items-center justify-center gap-2"
              >
                <Download size={18} /> Tải Video xuống
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
