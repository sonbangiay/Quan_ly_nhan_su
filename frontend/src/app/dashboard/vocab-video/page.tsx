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

interface TopicData {
  image?: string;
  word: string;
  kanji?: string;
  meaning: string;
}

const DEFAULT_TOPIC: TopicData = {
  word: 'Kanjou',
  kanji: '感情',
  meaning: 'Cảm xúc',
};

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
];

export default function VocabVideoGenerator() {
  const [topic, setTopic] = useState<TopicData>(DEFAULT_TOPIC);
  const [cards, setCards] = useState<CardData[]>(INITIAL_CARDS);
  const [numCards, setNumCards] = useState<number>(8); // 2, 4, 6, 8
  
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null); // 'topic' or card.id
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

  const handleImageUpload = (index: number | 'topic', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (index === 'topic') {
          setTopic({ ...topic, image: reader.result as string });
        } else {
          const newCards = [...cards];
          newCards[index].image = reader.result as string;
          setCards(newCards);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const getGridPosition = (index: number, total: number) => {
    // 3x3 Grid
    // [1,1] [1,2] [1,3]
    // [2,1] [2,2] [2,3]
    // [3,1] [3,2] [3,3]
    if (total === 8) {
      const positions = [
        { gridRow: 1, gridColumn: 1 }, { gridRow: 1, gridColumn: 2 }, { gridRow: 1, gridColumn: 3 },
        { gridRow: 2, gridColumn: 1 }, /* center */                   { gridRow: 2, gridColumn: 3 },
        { gridRow: 3, gridColumn: 1 }, { gridRow: 3, gridColumn: 2 }, { gridRow: 3, gridColumn: 3 },
      ];
      return positions[index];
    }
    if (total === 6) {
      const positions = [
        { gridRow: 1, gridColumn: 1 }, { gridRow: 1, gridColumn: 3 },
        { gridRow: 2, gridColumn: 1 }, { gridRow: 2, gridColumn: 3 },
        { gridRow: 3, gridColumn: 1 }, { gridRow: 3, gridColumn: 3 },
      ];
      return positions[index];
    }
    if (total === 4) {
      // Four corners
      const positions = [
        { gridRow: 1, gridColumn: 1 }, { gridRow: 1, gridColumn: 3 },
        { gridRow: 3, gridColumn: 1 }, { gridRow: 3, gridColumn: 3 },
      ];
      return positions[index];
    }
    if (total === 2) {
      // Top and bottom middle
      const positions = [
        { gridRow: 1, gridColumn: 2 },
        { gridRow: 3, gridColumn: 2 },
      ];
      return positions[index];
    }
    return {};
  };

  const speakText = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) {
        resolve();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.9;
      
      utterance.onend = () => {
        // slight pause
        setTimeout(resolve, 300);
      };
      
      utterance.onerror = (e) => {
        console.error('Speech error:', e);
        resolve();
      };
      
      window.speechSynthesis.speak(utterance);
    });
  };

  const playSequence = async () => {
    // 1. Topic
    setActiveHighlight('topic');
    // We try to read Kanji, if empty read Romaji/Word
    const topicText = topic.kanji || topic.word;
    await speakText(topicText);

    // 2. Cards
    for (let i = 0; i < cards.length; i++) {
      setActiveHighlight(cards[i].id);
      const cardText = cards[i].hiragana || cards[i].kanji || cards[i].romaji;
      await speakText(cardText);
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


  return (
    <div className="p-6 h-screen flex flex-col bg-[var(--bg-secondary)] overflow-hidden">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Video className="text-[var(--accent-purple)]" /> Tạo Video Từ Vựng (TikTok/Shorts)
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            Nhập liệu, chọn bố cục, và quay video trực tiếp bằng công nghệ Screen Capture
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
              {[2, 4, 6, 8].map(num => (
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
            {/* Topic Input */}
            <div className="p-4 rounded-lg bg-[var(--accent-blue)]/5 border border-[var(--accent-blue)]/20 relative">
              <div className="absolute top-0 right-0 bg-[var(--accent-blue)] text-white text-xs px-2 py-1 rounded-bl-lg rounded-tr-lg font-bold">
                Ô CHỦ ĐỀ TRUNG TÂM
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-4 mt-2">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-[var(--text-muted)]">Hình (Tuỳ chọn)</label>
                  <label className="w-full h-24 border-2 border-dashed border-[var(--border)] rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-[var(--bg-hover)] bg-white overflow-hidden">
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload('topic', e)} />
                    {topic.image ? (
                      <img src={topic.image} alt="Topic" className="w-full h-full object-contain" />
                    ) : (
                      <><Upload size={20} className="text-[var(--text-muted)] mb-1" /><span className="text-xs text-[var(--text-muted)]">Tải ảnh</span></>
                    )}
                  </label>
                  {topic.image && <button onClick={() => setTopic({...topic, image: undefined})} className="text-xs text-red-500 mt-1 w-full text-center hover:underline">Xoá ảnh</button>}
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-[var(--text-muted)]">Romaji (Kanjou)</label>
                      <input type="text" className="input text-sm w-full font-bold" value={topic.word} onChange={e => setTopic({...topic, word: e.target.value})} placeholder="Kanjou" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-[var(--text-muted)]">Kanji/Hiragana (感情)</label>
                      <input type="text" className="input text-sm w-full font-bold text-[var(--accent-orange)]" value={topic.kanji || ''} onChange={e => setTopic({...topic, kanji: e.target.value})} placeholder="感情" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-[var(--text-muted)]">Nghĩa Tiếng Việt</label>
                    <input type="text" className="input text-sm w-full font-bold" value={topic.meaning} onChange={e => setTopic({...topic, meaning: e.target.value})} placeholder="Cảm xúc" />
                  </div>
                </div>
              </div>
            </div>

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
            <div className="pt-10 pb-6 w-full flex items-center justify-center">
              <h2 className="text-3xl font-black text-[#1F3D7C] flex items-start">
                DORA <span className="bg-[#E94B6E] text-white text-[10px] px-1 py-0.5 rounded ml-0.5 leading-none mt-1 font-bold">ki</span>
              </h2>
            </div>

            {/* Grid Container */}
            <div 
              className="flex-1 w-full p-4 grid gap-3"
              style={{
                gridTemplateColumns: 'repeat(3, 1fr)',
                gridTemplateRows: 'repeat(3, 1fr)',
              }}
            >
              {/* Cards */}
              {cards.map((card, idx) => (
                <div 
                  key={card.id}
                  className={`bg-white rounded-[20px] shadow flex flex-col items-center justify-center p-2 text-center transition-all duration-300 ${activeHighlight === card.id ? 'ring-4 ring-yellow-400 scale-105' : ''}`}
                  style={{ ...getGridPosition(idx, numCards) }}
                >
                  <div className="h-16 w-16 mb-2 flex items-center justify-center">
                    {card.image ? (
                      <img src={card.image} alt="" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">Ảnh</div>
                    )}
                  </div>
                  <div className="text-[11px] font-bold text-gray-800 leading-tight mb-1">{card.romaji}</div>
                  <div className="text-sm font-black text-red-600 mb-1 leading-none">{card.hiragana}</div>
                  <div className="text-[10px] text-gray-600 leading-tight">{card.meaning}</div>
                </div>
              ))}

              {/* Topic Center Card */}
              <div 
                className={`bg-[#FFB6C1] rounded-[20px] shadow flex flex-col items-center justify-center p-2 text-center transition-all duration-300 ${activeHighlight === 'topic' ? 'ring-4 ring-yellow-400 scale-105' : ''}`}
                style={{ gridRow: 2, gridColumn: 2 }}
              >
                {topic.image && (
                  <div className="h-12 w-12 mb-1 flex items-center justify-center">
                    <img src={topic.image} alt="" className="max-w-full max-h-full object-contain" />
                  </div>
                )}
                <div className="text-xs font-bold text-gray-800 leading-tight mb-1">{topic.word}</div>
                <div className="text-3xl font-black text-[#E65100] mb-1">{topic.kanji}</div>
                <div className="text-sm font-bold text-gray-900">{topic.meaning}</div>
              </div>

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
                download={`Tu-Vung-${topic.meaning || 'Video'}.webm`}
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
