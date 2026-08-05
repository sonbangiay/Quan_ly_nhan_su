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

const EDGE_VOICES = [
  { voiceURI: 'ja-JP-NanamiNeural', name: '👩 Nanami (Giọng Nữ)' },
  { voiceURI: 'ja-JP-KeitaNeural', name: '👨 Keita (Giọng Nam)' }
];

export default function VocabVideoGenerator() {
  const [cards, setCards] = useState<CardData[]>(INITIAL_CARDS.slice(0, 2)); // Default to 2 cards
  const [numCards, setNumCards] = useState<number>(2); // 2, 4, 6, 9
  const [bgColor, setBgColor] = useState<string>('#90C9F9');
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<'vocab' | 'sentence' | 'story'>('vocab');
  const [topicTitle, setTopicTitle] = useState<string>('THỜI GIAN');
  
  // Voice Settings
  const [teacherVoiceURI, setTeacherVoiceURI] = useState<string>('ja-JP-NanamiNeural');
  const [studentVoiceURI, setStudentVoiceURI] = useState<string>('ja-JP-KeitaNeural');
  const [teacherPitch, setTeacherPitch] = useState<number>(1.0);
  const [studentPitch, setStudentPitch] = useState<number>(1.5); 

  // BGM Settings
  const [bgmUrl, setBgmUrl] = useState<string>('/bgm.mp3');
  const [bgmVolume, setBgmVolume] = useState<number>(0.15);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [showRecordModal, setShowRecordModal] = useState(false);
  
  const previewRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isRecordingRef = useRef<boolean>(false);

  // Adjust cards array size when numCards changes
  useEffect(() => {
    setCards(prevCards => {
      if (prevCards.length < numCards) {
        const newCards = [...prevCards];
        for (let i = prevCards.length; i < numCards; i++) {
          // Find data from INITIAL_CARDS if it exists to keep user content
          const initData = INITIAL_CARDS[i] || { kanji: '', romaji: '', hiragana: '', meaning: '' };
          newCards.push({
            ...initData,
            id: 'id' in initData ? initData.id : (Date.now().toString() + i),
            image: 'image' in initData ? initData.image : '',
          });
        }
        return newCards;
      } else if (prevCards.length > numCards) {
        return prevCards.slice(0, numCards);
      }
      return prevCards;
    });
  }, [numCards]);

  // Định nghĩa số lượng ô được phép cho từng chế độ
  const getAllowedCardCounts = () => {
    if (displayMode === 'vocab') return [2, 4, 6, 9];
    if (displayMode === 'sentence') return [3];
    if (displayMode === 'story') return [2, 4, 6, 9, 12, 15];
    return [2, 4, 6, 9];
  };

  // Đảm bảo chế độ Từ Vựng / Mẫu câu hiển thị đúng số lượng ô cho phép
  useEffect(() => {
    const allowed = getAllowedCardCounts();
    if (!allowed.includes(numCards)) {
      setNumCards(allowed[allowed.length > 1 ? 1 : 0]); // Mặc định về giá trị thứ 2 (vd: 4) hoặc giá trị duy nhất (vd: 3)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayMode]);

  // Helper to convert pitch value [0, 2] to Edge TTS format (e.g. +0Hz, -50Hz)
  const getPitchString = (val: number) => {
    const percent = Math.round((val - 1) * 50);
    return percent >= 0 ? `+${percent}%` : `${percent}%`;
  };

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

  const speakText = async (text: string, isStudent: boolean = false): Promise<void> => {
    return new Promise(async (resolve) => {
      try {
        const voice = isStudent ? studentVoiceURI : teacherVoiceURI;
        const pitchVal = isStudent ? studentPitch : teacherPitch;
        const pitch = getPitchString(pitchVal);
        
        // Chế độ kể chuyện sẽ đọc nhẹ nhàng, hơi chậm một chút để truyền cảm
        let rate = isStudent ? '-10%' : '+0%';
        let volume = '+0%';
        if (displayMode === 'story') {
          rate = '-12%'; 
          volume = '-30%'; // Giảm âm lượng để tạo cảm giác thủ thỉ, nhẹ nhàng
        }

        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice, pitch, rate, volume })
        });

        if (!res.ok) throw new Error('TTS API Error');

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        
        audio.onended = () => {
          URL.revokeObjectURL(url);
          setTimeout(resolve, 400); // 400ms pause between teacher and student
        };
        
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          resolve();
        };

        await audio.play();
      } catch (err) {
        console.error('Error playing TTS:', err);
        resolve(); // Continue even if error
      }
    });
  };

  const playSequence = async () => {
    if (bgmUrl && audioRef.current) {
      audioRef.current.volume = bgmVolume;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log('BGM play blocked:', e));
    }

    for (let i = 0; i < cards.length; i++) {
      setActiveHighlight(cards[i].id);
      const cardText = cards[i].hiragana || cards[i].kanji || cards[i].romaji;
      if (cardText) {
        await speakText(cardText, false); // Giáo viên / Người kể chuyện đọc
        if (displayMode !== 'story') {
          await speakText(cardText, true);  // Học sinh lặp lại (trừ chế độ kể chuyện)
        }
      }
    }
    setActiveHighlight(null);
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
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
          
          // Tính toán toạ độ tuyệt đối trên màn hình vật lý (Cho Entire Screen)
          const scaleX = hiddenVideo.videoWidth / window.screen.width;
          const scaleY = hiddenVideo.videoHeight / window.screen.height;

          // Tính độ dày của viền trình duyệt và thanh Tabs + URL
          const sideBorder = Math.max(0, (window.outerWidth - window.innerWidth) / 2);
          const topChromeHeight = Math.max(0, window.outerHeight - window.innerHeight - sideBorder);

          const screenX = window.screenX + sideBorder + rect.x;
          const screenY = window.screenY + topChromeHeight + rect.y;

          const sX = screenX * scaleX;
          const sY = screenY * scaleY;
          const sW = rect.width * scaleX;
          const sH = rect.height * scaleY;

          // Tô đen viền xung quanh để tránh rác màn hình
          ctx!.fillStyle = '#000';
          ctx!.fillRect(0, 0, outW, outH);
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

      // 1. Yêu cầu TOÀN MÀN HÌNH và ÂM THANH HỆ THỐNG để đảm bảo không rớt âm thanh speechSynthesis
      const stream = await navigator.mediaDevices.getDisplayMedia({
        // @ts-ignore
        video: { displaySurface: 'monitor' }, 
        audio: true
      });

      if (stream.getAudioTracks().length === 0) {
        alert("LỖI: BẠN CHƯA BẬT NÚT CHIA SẺ ÂM THANH HỆ THỐNG! Video sẽ bị mất tiếng.\nHãy nhấn 'Bắt đầu' lại và gạt công tắc Chia sẻ âm thanh nhé.");
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      setIsRecording(true);
      isRecordingRef.current = true;

      // 3. Tự động cắt bằng thuật toán Screen-Absolute Canvas (Chính xác tuyệt đối)
      const finalVideoStream = setupCanvasCrop(stream);

      // 4. Trộn Video ĐÃ CẮT + Âm thanh HỆ THỐNG
      const combinedStream = new MediaStream([
        ...finalVideoStream.getVideoTracks(),
        ...stream.getAudioTracks()
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
    if (numCards === 9) return { gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)' };
    if (numCards === 12) return { gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(4, 1fr)' };
    if (numCards === 15) return { gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(5, 1fr)' };
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
          </div>
          
          {/* Mode Switcher */}
          <div className="flex gap-2 mb-6 bg-[var(--bg-hover)] p-1 rounded-xl border border-[var(--border)] overflow-x-auto">
            <button 
              onClick={() => setDisplayMode('vocab')} 
              className={`whitespace-nowrap flex-1 py-2 px-3 rounded-lg font-bold text-sm transition-all ${displayMode === 'vocab' ? 'bg-white text-[var(--accent-purple)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-gray-900'}`}
            >
              🌟 Từ Vựng
            </button>
            <button 
              onClick={() => setDisplayMode('sentence')} 
              className={`whitespace-nowrap flex-1 py-2 px-3 rounded-lg font-bold text-sm transition-all ${displayMode === 'sentence' ? 'bg-white text-[var(--accent-purple)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-gray-900'}`}
            >
              📝 Mẫu câu
            </button>
            <button 
              onClick={() => setDisplayMode('story')} 
              className={`whitespace-nowrap flex-1 py-2 px-3 rounded-lg font-bold text-sm transition-all ${displayMode === 'story' ? 'bg-black text-[#eab308] shadow-sm' : 'text-[var(--text-secondary)] hover:text-gray-900'}`}
            >
              📖 Kể chuyện
            </button>
          </div>

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-1 bg-[var(--bg-hover)] p-1.5 rounded-lg border border-[var(--border)] w-full overflow-x-auto">
              <span className="text-sm font-medium px-2 shrink-0">Số lượng:</span>
              {getAllowedCardCounts().map(num => (
                <button 
                  key={num}
                  onClick={() => setNumCards(num)}
                  className={`flex-1 min-w-[36px] py-1 rounded text-sm font-medium transition-colors ${numCards === num ? 'bg-[var(--accent-purple)] text-white shadow' : 'text-[var(--text-secondary)] hover:bg-[var(--border)]'}`}
                >
                  {num} ô
                </button>
              ))}
            </div>
          </div>

          {displayMode === 'sentence' && (
            <div className="mb-6 p-4 bg-[#D6EFFC]/30 rounded-xl border border-[#D6EFFC]">
              <label className="block text-xs font-bold mb-2 text-[#1964C3]">Tiêu đề Video</label>
              <input type="text" className="input w-full font-black text-lg text-[#1964C3] border-[#1964C3]/20 focus:border-[#1964C3]" value={topicTitle} onChange={e => setTopicTitle(e.target.value)} placeholder="Ví dụ: THỜI GIAN" />
            </div>
          )}

          <div className="flex items-center justify-between mb-4 mt-4">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Settings2 size={18} /> Giao diện nền
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-[var(--border)]">
            <div>
              <label className="block text-xs font-semibold mb-1 text-[var(--text-muted)]">Màu nền</label>
              <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} disabled={displayMode === 'story'} className={`w-full h-10 rounded cursor-pointer border border-[var(--border)] ${displayMode === 'story' ? 'opacity-50 cursor-not-allowed' : ''}`} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-[var(--text-muted)]">Ảnh nền</label>
              <label className={`w-full h-10 border border-[var(--border)] rounded flex items-center justify-center cursor-pointer overflow-hidden bg-white ${displayMode === 'story' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[var(--bg-hover)]'}`}>
                <input type="file" className="hidden" accept="image/*" disabled={displayMode === 'story'} onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setBgImage(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }} />
                {bgImage ? <span className="text-xs font-bold text-green-600">Đã tải ảnh nền</span> : <span className="text-xs text-[var(--text-muted)]">Tải lên ảnh</span>}
              </label>
              {bgImage && displayMode !== 'story' && <button onClick={() => setBgImage(null)} className="text-xs text-red-500 mt-1 hover:underline text-center w-full">Xoá ảnh nền</button>}
            </div>
            {displayMode === 'story' && (
              <div className="col-span-2 text-[11px] text-[#eab308] bg-black/90 p-2 rounded text-center">
                Chế độ Kể chuyện tự động ép nền sang màu đen.
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mb-4 mt-4">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Settings2 size={18} /> Cấu hình Âm thanh & Giọng đọc
            </h2>
          </div>
          <div className={`grid ${displayMode === 'story' ? 'grid-cols-1' : 'grid-cols-2'} gap-4 mb-6 pb-6 border-b border-[var(--border)]`}>
            <div className="space-y-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
              <div>
                <label className="block text-xs font-bold mb-1 text-blue-800">
                  {displayMode === 'story' ? '🎙️ Người kể chuyện' : '👩‍🏫 Giáo viên (Đọc trước)'}
                </label>
                <select 
                  value={teacherVoiceURI} 
                  onChange={e => setTeacherVoiceURI(e.target.value)} 
                  className="w-full h-9 rounded-lg border border-blue-200 text-sm px-2 bg-white focus:ring-2 focus:ring-blue-400 outline-none"
                >
                  {EDGE_VOICES.map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-600 font-medium w-12">Độ cao:</span>
                <input type="range" min="0" max="2" step="0.1" value={teacherPitch} onChange={e=>setTeacherPitch(Number(e.target.value))} className="flex-1 accent-blue-600" />
                <span className="text-[11px] font-bold text-blue-700 w-6">{teacherPitch}</span>
              </div>
            </div>

            {displayMode !== 'story' && (
              <div className="space-y-3 p-3 bg-red-50/50 rounded-xl border border-red-100">
                <div>
                  <label className="block text-xs font-bold mb-1 text-red-800">🧒 Học sinh (Lặp lại)</label>
                  <select 
                    value={studentVoiceURI} 
                    onChange={e => setStudentVoiceURI(e.target.value)} 
                    className="w-full h-9 rounded-lg border border-red-200 text-sm px-2 bg-white focus:ring-2 focus:ring-red-400 outline-none"
                  >
                    {EDGE_VOICES.map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-600 font-medium w-12">Độ cao:</span>
                  <input type="range" min="0" max="2" step="0.1" value={studentPitch} onChange={e=>setStudentPitch(Number(e.target.value))} className="flex-1 accent-red-600" />
                  <span className="text-[11px] font-bold text-red-700 w-6">{studentPitch}</span>
                </div>
              </div>
            )}
            
            {/* Nhạc nền */}
            <div className={`${displayMode === 'story' ? 'col-span-1' : 'col-span-2'} mt-1 p-3 bg-purple-50/50 rounded-xl border border-purple-100 flex flex-col gap-2`}>
              <label className="block text-xs font-bold text-purple-800">🎵 Nhạc nền (Background Music)</label>
              <div className="flex items-center gap-3">
                <label className="shrink-0 px-3 py-1.5 bg-white border border-purple-200 hover:border-purple-300 rounded-lg text-[11px] font-bold text-purple-700 cursor-pointer transition-colors shadow-sm">
                  <input type="file" className="hidden" accept="audio/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const url = URL.createObjectURL(file);
                      setBgmUrl(url);
                    }
                  }} />
                  {bgmUrl ? 'Đổi nhạc khác' : 'Tải nhạc lên'}
                </label>
                <div className="flex-1 flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-purple-100 shadow-sm">
                  <span className="text-[11px] text-gray-600 font-medium">Âm lượng:</span>
                  <input 
                    type="range" min="0" max="1" step="0.05" 
                    value={bgmVolume} 
                    onChange={e => {
                      const vol = Number(e.target.value);
                      setBgmVolume(vol);
                      if (audioRef.current) audioRef.current.volume = vol;
                    }} 
                    className="flex-1 accent-purple-500" 
                  />
                  <span className="text-[11px] font-bold text-purple-700 w-8 text-right">{Math.round(bgmVolume * 100)}%</span>
                </div>
                {bgmUrl && (
                   <button onClick={() => setBgmUrl('')} className="text-[11px] text-red-500 hover:underline shrink-0 font-medium">Xoá nhạc</button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Cards Input */}
            <div className="grid grid-cols-2 gap-4">
              {cards.map((card, idx) => (
                <div key={card.id} className="p-4 rounded-lg bg-white border border-[var(--border)] shadow-sm">
                  <div className="font-bold text-sm mb-3 flex items-center justify-between border-b border-[var(--border)] pb-2">
                    <span>{displayMode === 'vocab' ? `Ô từ vựng #${idx + 1}` : `Câu #${idx + 1}`}</span>
                  </div>
                  <div className={`grid ${displayMode === 'vocab' ? 'grid-cols-[80px_1fr]' : 'grid-cols-1'} gap-3`}>
                    {displayMode === 'vocab' && (
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
                    )}
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
        {/* Layout khi quay: Nền đen, đẩy video lên cao để chừa khoảng trống cho thanh chia sẻ Chrome rớt xuống dưới, không bị dính vào khung cắt */}
        <div className={isRecording ? "fixed inset-0 z-[100] bg-black flex flex-col items-center justify-start pt-10 pb-[120px]" : "w-[450px] shrink-0 bg-[var(--bg-primary)] p-4 rounded-xl border border-[var(--border)] flex flex-col items-center justify-center relative"}>

          {/* The Actual Video Frame Container (9:16 aspect ratio) */}
          <div 
            ref={previewRef}
            className="relative overflow-hidden flex flex-col items-center shadow-2xl transition-all duration-300"
            style={{ 
              width: isRecording ? 'auto' : '100%',
              height: isRecording ? '100%' : 'auto', 
              aspectRatio: '9/16',
              borderRadius: isRecording ? 0 : 24, 
              boxShadow: isRecording ? 'none' : '0 10px 30px rgba(0,0,0,0.1)',
              backgroundColor: displayMode === 'story' ? '#000000' : bgColor,
              backgroundImage: (bgImage && displayMode !== 'story') ? `url(${bgImage})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            {/* Header / Logo space */}
            <div className="pt-6 pb-2 w-full flex items-center justify-center shrink-0 z-10 relative">
              <img 
                src="https://nhanphuphuyen.edu.vn/wp-content/uploads/2026/08/Gemini_Generated_Image_c5cnlnc5cnlnc5cn-removebg-preview.png" 
                alt="Du học Nhân Phú Logo" 
                className={`h-16 md:h-20 object-contain drop-shadow-md ${displayMode === 'story' ? 'opacity-80' : ''}`}
              />
            </div>

            {/* Dynamic Grid Container (VOCAB MODE) */}
            {displayMode === 'vocab' && (
              <div 
                className="flex-1 w-full px-4 pb-2 grid gap-3 transition-all duration-500"
                style={{
                  ...getGridTemplate(),
                  paddingBottom: 16 // Giảm padding dưới để không bị lẹm
                }}
              >
                {/* Cards */}
                {cards.map((card) => (
                  <div 
                    key={card.id}
                    className={`bg-white rounded-3xl shadow-md flex flex-col items-center justify-center p-2 text-center transition-all duration-300 ${activeHighlight === card.id ? 'ring-[6px] ring-yellow-400 scale-[1.02]' : ''}`}
                  >
                    <div className="flex-1 min-h-[3rem] w-full flex items-center justify-center mb-1">
                      {card.image ? (
                        <img src={card.image} alt="" className="max-w-full max-h-[70px] md:max-h-[120px] object-contain drop-shadow-sm" />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center text-xs text-gray-300 border border-dashed border-gray-200">Ảnh</div>
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
            )}

            {/* Sentence List Container (SENTENCE MODE) */}
            {displayMode === 'sentence' && (
              <div className="flex-1 w-full px-5 pb-8 flex flex-col z-10 relative justify-center">
                <div className="w-full bg-[#D6EFFC]/95 backdrop-blur-md rounded-[32px] flex flex-col p-6 shadow-2xl border border-white/50">
                  <h2 className="text-[26px] md:text-[30px] font-black text-center text-[#1964C3] mb-6 tracking-wide drop-shadow-sm uppercase">
                    {topicTitle}
                  </h2>
                  <div className="flex flex-col gap-5">
                    {cards.map((card) => {
                      const isActive = activeHighlight === card.id;
                      return (
                        <div 
                          key={card.id}
                          className={`w-full rounded-2xl flex flex-col items-center justify-center py-4 px-3 text-center transition-all duration-300 ${
                            isActive 
                              ? 'bg-[#FFC7D8] border-[3px] border-[#FF9EBC] scale-[1.03] shadow-lg shadow-pink-200/50' 
                              : 'bg-transparent border-[3px] border-transparent'
                          }`}
                        >
                          <div className={`font-black tracking-wide leading-tight text-[#C9002B] ${numCards <= 4 ? 'text-[24px]' : 'text-[18px]'}`}>
                            {card.hiragana}
                          </div>
                          <div className={`font-bold text-gray-800 leading-tight mt-1.5 ${numCards <= 4 ? 'text-[15px]' : 'text-xs'}`}>
                            /{card.romaji}/
                          </div>
                          <div className={`font-semibold text-gray-800 leading-tight mt-1.5 ${numCards <= 4 ? 'text-[16px]' : 'text-sm'}`}>
                            {card.meaning}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Story List Container (STORY MODE) */}
            {displayMode === 'story' && (
              <div className="flex-1 w-full px-8 pb-12 flex flex-col items-center justify-center z-10 relative">
                {cards.map((card, idx) => {
                  // Chỉ hiển thị card đang được đọc, hoặc card đầu tiên nếu chưa bắt đầu đọc
                  const isActive = activeHighlight ? (activeHighlight === card.id) : (idx === 0);
                  if (!isActive) return null;

                  return (
                    <div 
                      key={card.id}
                      className="w-full flex flex-col items-center justify-center gap-4 text-center animate-in fade-in zoom-in-95 duration-500"
                    >
                      <div className={`font-serif tracking-widest text-[#eab308] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${numCards <= 4 ? 'text-[32px]' : 'text-[24px]'}`}>
                        {card.hiragana}
                      </div>
                      <div className={`font-light tracking-widest text-gray-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${numCards <= 4 ? 'text-[20px]' : 'text-[16px]'}`}>
                        {card.romaji}
                      </div>
                      <div className={`font-medium tracking-wide text-[#eab308] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${numCards <= 4 ? 'text-[24px]' : 'text-[18px]'}`}>
                        {card.meaning}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
              <p className="text-gray-700 font-medium text-[15px]">Để lấy được <strong>giọng học sinh</strong> và có âm thanh to rõ, bạn vui lòng làm đúng 2 bước:</p>
              
              <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 shadow-inner">
                <ol className="list-decimal list-inside space-y-3 text-[15px] text-blue-900 font-semibold">
                  <li>Phía trên chọn đúng mục <strong>"Toàn màn hình"</strong> (Entire Screen).</li>
                  <li>Bật công tắc <strong>"Chia sẻ âm thanh hệ thống"</strong> ở góc dưới bên trái!</li>
                </ol>
              </div>
              
              <p className="text-[13.5px] text-green-700 font-semibold bg-green-50 p-3 rounded-xl border border-green-200 flex items-start gap-2">
                <span>✨</span> Hệ thống sẽ tự động ghép âm thanh và tự động dò toạ độ để cắt chuẩn viền video cho bạn.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowRecordModal(false)} className="px-5 py-2.5 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition-colors">Hủy</button>
              <button 
                onClick={startActualRecording} 
                className="px-6 py-2.5 bg-[var(--accent-purple)] text-white font-bold rounded-xl hover:opacity-90 shadow-lg shadow-purple-500/30 transition-transform active:scale-95 flex items-center gap-2"
              >
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
      {bgmUrl && <audio ref={audioRef} src={bgmUrl} loop />}
    </div>
  );
}
