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
  
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  
  const previewRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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

  const speakText = (text: string, isStudent: boolean = false): Promise<void> => {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) {
        resolve();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      
      if (isStudent) {
        // Giọng học sinh: Chỉnh cao lên 1 chút (1.15) thay vì quá cao (1.6) để tránh bị méo tiếng như robot, đồng thời đọc chậm lại
        utterance.pitch = 1.15;
        utterance.rate = 0.8;
      } else {
        // Giọng cô giáo: Chuẩn
        utterance.pitch = 1.0;
        utterance.rate = 0.95;
      }
      
      utterance.onend = () => {
        // Nghỉ một nhịp nhỏ giữa cô giáo và học sinh
        setTimeout(resolve, 400);
      };
      
      utterance.onerror = (e) => {
        console.error('Speech error:', e);
        resolve();
      };
      
      window.speechSynthesis.speak(utterance);
    });
  };

  const playSequence = async () => {
    // Đảm bảo huỷ các giọng đọc đang bị kẹt
    window.speechSynthesis.cancel();
    
    // Cards
    for (let i = 0; i < cards.length; i++) {
      setActiveHighlight(cards[i].id);
      const cardText = cards[i].hiragana || cards[i].kanji || cards[i].romaji;
      if (cardText) {
        await speakText(cardText, false); // Cô giáo đọc
        await speakText(cardText, true);  // Học sinh lặp lại
      }
    }

    setActiveHighlight(null);
  };

  const startRecording = async () => {
    try {
      setVideoUrl(null);
      // Request screen capture
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser' },
        audio: true // Important for capturing TTS
      });

      // Prepare media recorder
      const options = { mimeType: 'video/webm;codecs=vp8,opus' };
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        // Stop all tracks to end screen sharing
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
      };

      // Start recording
      mediaRecorder.start();
      setIsRecording(true);

      // Add a small delay for recording to stabilize, then play sequence
      setTimeout(async () => {
        await playSequence();
        // Stop recording after sequence ends
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      }, 1000);

    } catch (err) {
      console.error('Error starting recording:', err);
      alert('Không thể bắt đầu quay video. Vui lòng cấp quyền chia sẻ màn hình và check "Chia sẻ âm thanh"!');
      setIsRecording(false);
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
            onClick={startRecording}
            disabled={isRecording}
            className="btn btn-primary flex items-center gap-2 px-4 py-2 bg-[var(--accent-purple)] text-white border-none"
          >
            {isRecording ? <span className="spinner w-4 h-4" /> : <Video size={18} />}
            {isRecording ? 'Đang quay...' : 'Bắt đầu quay Video'}
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
        <div className="w-[450px] shrink-0 bg-[var(--bg-primary)] p-4 rounded-xl border border-[var(--border)] flex flex-col items-center justify-center relative">
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Live Preview</span>
            {isRecording && <span className="flex items-center gap-2 text-red-500 font-bold text-sm bg-red-50 px-3 py-1 rounded-full animate-pulse"><span className="w-2 h-2 rounded-full bg-red-500"></span> Đang quay</span>}
          </div>

          {/* The Actual Video Frame Container (9:16 aspect ratio) */}
          <div 
            ref={previewRef}
            className="relative bg-[#90C9F9] overflow-hidden flex flex-col items-center shadow-2xl transition-all duration-300"
            style={{ 
              width: '100%', 
              aspectRatio: '9/16',
              borderRadius: isRecording ? 0 : 24, // Remove border radius when recording for clean edges
              boxShadow: isRecording ? '0 0 0 4px #ef4444' : '0 10px 30px rgba(0,0,0,0.1)',
              transform: isRecording ? 'scale(1.05)' : 'scale(1)'
            }}
          >
            {/* Header / Logo space */}
            <div className="pt-10 pb-6 w-full flex items-center justify-center shrink-0">
              <h2 className="text-3xl font-black text-[#1F3D7C] flex items-start">
                DORA <span className="bg-[#E94B6E] text-white text-[10px] px-1 py-0.5 rounded ml-0.5 leading-none mt-1 font-bold">ki</span>
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

      {/* Video Result Modal */}
      {videoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
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
