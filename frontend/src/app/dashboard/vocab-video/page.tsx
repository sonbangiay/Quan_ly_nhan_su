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

interface QuizQuestion {
  id: string;
  type?: 'ja-vi' | 'vi-ja';
  question: string;    // Hiragana/Kanji (câu hỏi)
  romaji: string;      // Romaji của câu hỏi
  questionSuffix?: string; // Chữ phụ bên dưới (mặc định: nghĩa là gì?)
  correct: string;     // Đáp án đúng
  wrongA: string;      // Đáp án sai 1
  wrongB: string;      // Đáp án sai 2
}

interface GrammarExample {
  id: string;
  romaji: string;
  japanese: string;
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
  { id: '10', image: '', kanji: '', romaji: '', hiragana: '', meaning: '' },
  { id: '11', image: '', kanji: '', romaji: '', hiragana: '', meaning: '' },
  { id: '12', image: '', kanji: '', romaji: '', hiragana: '', meaning: '' },
  { id: '13', image: '', kanji: '', romaji: '', hiragana: '', meaning: '' },
  { id: '14', image: '', kanji: '', romaji: '', hiragana: '', meaning: '' },
  { id: '15', image: '', kanji: '', romaji: '', hiragana: '', meaning: '' },
];

const EDGE_VOICES = [
  { voiceURI: 'ja-JP-NanamiNeural', name: '👩 Nanami (Giọng Nữ)' },
  { voiceURI: 'ja-JP-KeitaNeural', name: '👨 Keita (Giọng Nam)' }
];

interface ThemePreset {
  id: string;
  name: string;
  badge?: string;
  bgColor: string;
  cardBgColor: string;
  pillBgColor: string;
  pillTextColor: string;
  headerBgGradient: string;
  headerTextColor?: string;
  textColor: string;
}

const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'red-energy',
    name: '🔥 Đỏ Nổi Bật (Red Energy)',
    badge: 'MẪU HOT',
    bgColor: 'linear-gradient(180deg, #ED1C24 0%, #B30006 100%)',
    cardBgColor: '#00E5FF',
    pillBgColor: '#FFFFFF',
    pillTextColor: '#003893',
    headerBgGradient: 'linear-gradient(180deg, #091c36 0%, #061325 100%)',
    headerTextColor: '#00E5FF',
    textColor: '#ffffff'
  },
  {
    id: 'cyan-vibrant',
    name: '⚡ Xanh Cyan Năng Động',
    badge: 'TƯƠI SÁNG',
    bgColor: 'linear-gradient(180deg, #0284C7 0%, #0369A1 100%)',
    cardBgColor: '#FFE600',
    pillBgColor: '#FFFFFF',
    pillTextColor: '#003893',
    headerBgGradient: 'linear-gradient(180deg, #091c36 0%, #061325 100%)',
    headerTextColor: '#FFE600',
    textColor: '#ffffff'
  },
  {
    id: 'midnight-navy',
    name: '🌙 Xanh Đêm Navy',
    badge: 'SANG TRỌNG',
    bgColor: 'linear-gradient(180deg, #0B192C 0%, #1E3E62 100%)',
    cardBgColor: '#00E5FF',
    pillBgColor: '#FFFFFF',
    pillTextColor: '#003893',
    headerBgGradient: 'linear-gradient(180deg, #091c36 0%, #061325 100%)',
    headerTextColor: '#00E5FF',
    textColor: '#ffffff'
  },
  {
    id: 'royal-purple',
    name: '💜 Tím Hoàng Gia',
    badge: 'NỔI BẬT',
    bgColor: 'linear-gradient(180deg, #581C87 0%, #3B0764 100%)',
    cardBgColor: '#00E5FF',
    pillBgColor: '#FFFFFF',
    pillTextColor: '#003893',
    headerBgGradient: 'linear-gradient(180deg, #091c36 0%, #061325 100%)',
    headerTextColor: '#FFD700',
    textColor: '#ffffff'
  },
  {
    id: 'emerald-fresh',
    name: '🌱 Xanh Ngọc Fresh',
    badge: 'TƯƠI MÁT',
    bgColor: 'linear-gradient(180deg, #047857 0%, #064E3B 100%)',
    cardBgColor: '#FFE600',
    pillBgColor: '#FFFFFF',
    pillTextColor: '#064E3B',
    headerBgGradient: 'linear-gradient(180deg, #064E3B 0%, #022C22 100%)',
    headerTextColor: '#FFE600',
    textColor: '#ffffff'
  },
  {
    id: 'sunset-amber',
    name: '☀️ Cam Hoàng Hôn',
    badge: 'ẤM ÁP',
    bgColor: 'linear-gradient(180deg, #EA580C 0%, #9A3412 100%)',
    cardBgColor: '#00E5FF',
    pillBgColor: '#FFFFFF',
    pillTextColor: '#7C2D12',
    headerBgGradient: 'linear-gradient(180deg, #431407 0%, #1C0A04 100%)',
    headerTextColor: '#FFE600',
    textColor: '#ffffff'
  },
  {
    id: 'cyberpunk',
    name: '🖤 Cyberpunk Neon',
    badge: 'HIỆN ĐẠI',
    bgColor: 'linear-gradient(180deg, #09090B 0%, #18181B 100%)',
    cardBgColor: '#FF007F',
    pillBgColor: '#00E5FF',
    pillTextColor: '#09090B',
    headerBgGradient: 'linear-gradient(180deg, #27272A 0%, #09090B 100%)',
    headerTextColor: '#FF007F',
    textColor: '#ffffff'
  }
];

export default function VocabVideoGenerator() {
  const [cards, setCards] = useState<CardData[]>(INITIAL_CARDS.slice(0, 2)); // Default to 2 cards
  const [numCards, setNumCards] = useState<number>(2); // 2, 4, 6, 9
  
  // Theme Presets & Color state
  const [activeThemeId, setActiveThemeId] = useState<string>('red-energy');
  const [bgColor, setBgColor] = useState<string>('linear-gradient(180deg, #ED1C24 0%, #B30006 100%)');
  const [textColor, setTextColor] = useState<string>('#ffffff');
  const [cardBgColor, setCardBgColor] = useState<string>('#00E5FF');
  const [pillBgColor, setPillBgColor] = useState<string>('#FFFFFF');
  const [pillTextColor, setPillTextColor] = useState<string>('#003893');
  const [headerBgGradient, setHeaderBgGradient] = useState<string>('linear-gradient(180deg, #091c36 0%, #061325 100%)');
  const [headerTextColor, setHeaderTextColor] = useState<string>('#00E5FF');

  const [bgMedia, setBgMedia] = useState<{ url: string, type: 'image' | 'video' } | null>(null);
  const [displayMode, setDisplayMode] = useState<'vocab' | 'sentence' | 'story' | 'quiz' | 'grammar'>('vocab');
  const [topicTitle, setTopicTitle] = useState<string>('THỜI GIAN');

  const applyThemePreset = (preset: ThemePreset) => {
    setActiveThemeId(preset.id);
    setBgColor(preset.bgColor);
    setCardBgColor(preset.cardBgColor);
    setPillBgColor(preset.pillBgColor);
    setPillTextColor(preset.pillTextColor);
    setHeaderBgGradient(preset.headerBgGradient);
    setHeaderTextColor(preset.headerTextColor || '#00E5FF');
    setTextColor(preset.textColor);
  };

  // Grammar state
  const [grammarTitlePink, setGrammarTitlePink] = useState<string>('NGỮ PHÁP N3');
  const [grammarTitleCyan, setGrammarTitleCyan] = useState<string>('SẼ XUẤT HIỆN TRONG ĐỀ THI JLPT');
  const [grammarPattern, setGrammarPattern] = useState<string>('V てからでないと');
  const [grammarMeaning, setGrammarMeaning] = useState<string>('Nếu chưa...thì không...');
  const [grammarExamples, setGrammarExamples] = useState<GrammarExample[]>([
    {
      id: 'g1',
      romaji: '/Kichinto tashikamete kara de nai to shippai suru yo./',
      japanese: 'きちんと確かめてからでないと失敗するよ。',
      meaning: 'Nếu không kiểm tra lại kỹ càng thì sẽ hỏng việc đấy.'
    },
    {
      id: 'g2',
      romaji: '/Te o aratte kara de nai to, gohan o tabete wa ikemasen yo./',
      japanese: '手を洗ってからでないと、ご飯を食べではいけませんよ。',
      meaning: 'Nếu mà chưa rửa tay thì không được ăn cơm đâu đấy.'
    },
    {
      id: 'g3',
      romaji: '/Byōki ga naotte kara de nakereba hageshii undō wa muri da./',
      japanese: '病気が治ってからでないと激しい運動は無理だ。',
      meaning: 'Nếu chưa khỏi ốm, thì không được vận động mạnh nhé.'
    }
  ]);

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([
    { id: 'q1', type: 'ja-vi', question: 'おまたせしました', romaji: 'omatase shimashita', correct: 'Xin lỗi vì đã làm bạn chờ', wrongA: 'Tôi hiểu rồi', wrongB: 'Cảm ơn bạn đã đến' },
    { id: 'q2', type: 'ja-vi', question: 'いかり', romaji: 'ikari', correct: 'Nổi giận', wrongA: 'Xúc động', wrongB: 'Mặt nài nỉ' },
    { id: 'q3', type: 'ja-vi', question: 'ぜっきょう', romaji: 'zekkyou', correct: 'Hét lên vì sợ hãi', wrongA: 'Dằn vặt', wrongB: 'Nước mắt nhẹ nhõm' },
  ]);
  const [quizIndex, setQuizIndex] = useState<number>(0);
  const [quizCountdown, setQuizCountdown] = useState<number | null>(null);
  const [quizShowAnswer, setQuizShowAnswer] = useState<boolean>(false);
  const quizTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
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
          // Dùng dữ liệu từ INITIAL_CARDS (đã mở rộng tới 15 ô)
          const initData = INITIAL_CARDS[i];
          newCards.push({
            ...initData,
            id: initData.id || (Date.now().toString() + i),
            image: initData.image || '',
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
    if (displayMode === 'sentence') return [3, 4, 5];
    if (displayMode === 'story') return [2, 4, 6, 9, 12, 15];
    if (displayMode === 'grammar') return [1, 2, 3, 4];
    return [2, 4, 6, 9];
  };

  // Shuffle 3 options for a quiz question
  const getShuffledOptions = (q: QuizQuestion): string[] => {
    const opts = [q.correct, q.wrongA, q.wrongB];
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    return opts;
  };

  // Shuffled options are recalculated only when question changes
  const [quizOptions, setQuizOptions] = useState<string[]>(() => {
    const q = { id: 'q1', question: 'おまたせしました', romaji: 'omatase shimashita', correct: 'Xin lỗi vì đã làm bạn chờ', wrongA: 'Tôi hiểu rồi', wrongB: 'Cảm ơn bạn đã đến' };
    return [q.correct, q.wrongA, q.wrongB];
  });

  const strokeColor = (textColor.toLowerCase() === '#ffffff' || textColor.toLowerCase() === '#fff') ? '#eab308' : 'white';

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
        setCards(prev => {
          const newCards = [...prev];
          newCards[index] = { ...newCards[index], image: reader.result as string };
          return newCards;
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const XLSX = await import('xlsx');
      const reader = new FileReader();
      reader.onload = (evt) => {
        const data = evt.target?.result;
        if (data) {
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
          
          // Skip header row if it contains text in first cell
          let rows = jsonData;
          if (rows.length > 0 && typeof rows[0][0] === 'string' && (rows[0][0].toLowerCase().includes('tiếng nhật') || rows[0][0].toLowerCase().includes('tieng nhat') || rows[0][0].toLowerCase().includes('kanji'))) {
            rows = rows.slice(1);
          }

          // Lọc ra các dòng có dữ liệu
          const validRows = rows.filter(row => row.some(cell => cell));
          
          if (validRows.length === 0) {
            alert("File Excel không có dữ liệu hợp lệ!");
            return;
          }

          // Lấy tối đa theo giới hạn của mode hiện tại
          const allowedCounts = getAllowedCardCounts();
          const maxAllowed = Math.max(...allowedCounts);
          const dataToUse = validRows.slice(0, maxAllowed);

          // Tự động tìm số ô phù hợp nhất
          let targetNumCards = dataToUse.length;
          let bestNumCards = allowedCounts.find(n => n >= targetNumCards);
          if (!bestNumCards) bestNumCards = maxAllowed;

          setNumCards(bestNumCards);

          // Cập nhật mảng cards
          setCards(prevCards => {
            const newCards = [...prevCards];
            
            // Mở rộng mảng nếu cần
            if (newCards.length < bestNumCards) {
               for (let i = newCards.length; i < bestNumCards; i++) {
                 const initData = INITIAL_CARDS[i] || { kanji: '', romaji: '', hiragana: '', meaning: '' };
                 newCards.push({
                   ...initData,
                   id: initData.id || (Date.now().toString() + i),
                   image: initData.image || '',
                 });
               }
            } else if (newCards.length > bestNumCards) {
               newCards.length = bestNumCards; // Truncate
            }

            // Gán dữ liệu (Cột 0: Hiragana/Kanji, Cột 1: Romaji, Cột 2: Nghĩa)
            dataToUse.forEach((row, idx) => {
              if (idx < newCards.length) {
                 newCards[idx] = {
                   ...newCards[idx],
                   hiragana: (row[0] || '').toString(),
                   romaji: (row[1] || '').toString(),
                   meaning: (row[2] || '').toString()
                 };
              }
            });

            return newCards;
          });
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error(err);
      alert("Có lỗi xảy ra khi đọc file Excel.");
    }
    
    e.target.value = '';
  };

  const speakText = async (text: string, isStudent: boolean = false): Promise<void> => {
    return new Promise(async (resolve) => {
      try {
        const voice = isStudent ? studentVoiceURI : teacherVoiceURI;
        let pitchVal = isStudent ? studentPitch : teacherPitch;
        
        // Chế độ kể chuyện sẽ đọc thật chậm, trầm và nhỏ để tạo cảm giác buồn, cảm động
        let rate = isStudent ? '-10%' : '+0%';
        let volume = '+0%';
        if (displayMode === 'story') {
          rate = '-25%'; // Thật chậm rãi
          volume = '-50%'; // Rất nhỏ nhẹ, như thủ thỉ
          pitchVal = Math.max(0, pitchVal - 0.3); // Trầm xuống rõ rệt
        }

        const pitch = getPitchString(pitchVal);

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

  const playQuizSequence = async () => {
    if (bgmUrl && audioRef.current) {
      audioRef.current.volume = bgmVolume;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log('BGM play blocked:', e));
    }

    for (let i = 0; i < quizQuestions.length; i++) {
      const q = quizQuestions[i];
      const shuffled = getShuffledOptions(q);

      setQuizIndex(i);
      setQuizOptions(shuffled);
      setQuizShowAnswer(false);
      setQuizCountdown(3);

      // Read the question aloud first (chỉ đọc nếu là tiếng Nhật)
      if (q.type !== 'vi-ja') {
        await speakText(q.question, false);
      }

      // Countdown 3 → 2 → 1 → 0
      await new Promise<void>((resolve) => {
        let count = 3;
        quizTimerRef.current = setInterval(() => {
          count -= 1;
          if (count <= 0) {
            clearInterval(quizTimerRef.current!);
            setQuizCountdown(0);
            resolve();
          } else {
            setQuizCountdown(count);
          }
        }, 1000);
      });

      // Reveal answer (visual only, no reading)
      setQuizShowAnswer(true);
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      } catch (e) {}

      // Nếu là câu hỏi Việt -> Nhật thì đọc tiếng Nhật ở phần đáp án đúng
      if (q.type === 'vi-ja') {
        await speakText(q.correct, false);
      }

      // Pause to let viewer see the answer before next question
      await new Promise(r => setTimeout(r, 2500));
    }

    setQuizCountdown(null);
    setQuizShowAnswer(false);

    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const playGrammarSequence = async () => {
    if (bgmUrl && audioRef.current) {
      audioRef.current.volume = bgmVolume;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log('BGM play blocked:', e));
    }

    // Hiệu ứng highlight tự động chuyển theo thời gian trong lúc chỉ phát nhạc nền (Không đọc TTS)
    if (grammarPattern) {
      setActiveHighlight('grammar-pattern');
      await new Promise(res => setTimeout(res, 2500));
    }

    for (let i = 0; i < grammarExamples.length; i++) {
      const ex = grammarExamples[i];
      if (ex.japanese || ex.meaning) {
        setActiveHighlight(ex.id);
        await new Promise(res => setTimeout(res, 3000));
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
        if (displayMode === 'quiz') {
          await playQuizSequence();
        } else if (displayMode === 'grammar') {
          await playGrammarSequence();
        } else {
          await playSequence();
        }
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
            onClick={displayMode === 'quiz' ? playQuizSequence : displayMode === 'grammar' ? playGrammarSequence : playSequence}
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
            <label className="btn btn-outline text-xs px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-[var(--accent-purple)] hover:text-white transition-colors rounded-lg border border-[var(--border)] font-bold shadow-sm bg-white">
              <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleExcelImport} />
              <Upload size={14} /> Nhập từ Excel
            </label>
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
            <button 
              onClick={() => setDisplayMode('quiz')} 
              className={`whitespace-nowrap flex-1 py-2 px-3 rounded-lg font-bold text-sm transition-all ${displayMode === 'quiz' ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-gray-900'}`}
            >
              🎯 Trắc nghiệm
            </button>
            <button 
              onClick={() => setDisplayMode('grammar')} 
              className={`whitespace-nowrap flex-1 py-2 px-3 rounded-lg font-bold text-sm transition-all ${displayMode === 'grammar' ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-gray-900'}`}
            >
              📘 Ngữ pháp
            </button>
          </div>

          {displayMode !== 'grammar' && (
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
          )}

          {(displayMode === 'vocab' || displayMode === 'sentence' || displayMode === 'story') && (
            <div className="mb-6 p-4 bg-[#D6EFFC]/30 rounded-xl border border-[#D6EFFC]">
              <label className="block text-xs font-bold mb-2 text-[#1964C3]">Tiêu đề Video</label>
              <input type="text" className="input w-full font-black text-lg text-[#1964C3] border-[#1964C3]/20 focus:border-[#1964C3]" value={topicTitle} onChange={e => setTopicTitle(e.target.value)} placeholder="Ví dụ: THỜI GIAN" />
            </div>
          )}

          {/* Presets Phối Màu Đẹp Mắt */}
          <div className="mb-6 p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-yellow-400 flex items-center gap-1.5">
                🎨 Bảng Phối Màu Presets (Mẫu Đẹp)
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">1-Click đổi màu</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2.5">
              {THEME_PRESETS.map((preset) => {
                const isSelected = activeThemeId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => applyThemePreset(preset)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1.5 relative overflow-hidden ${
                      isSelected 
                        ? 'border-yellow-400 ring-2 ring-yellow-400/50 bg-slate-800 shadow-md scale-[1.02]' 
                        : 'border-slate-700 bg-slate-800/60 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    {preset.badge && (
                      <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[8.5px] font-black bg-rose-600 text-white uppercase tracking-wider">
                        {preset.badge}
                      </span>
                    )}
                    <span className="text-xs font-bold text-white pr-12 truncate">
                      {preset.name}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span 
                        className="w-4 h-4 rounded-full border border-white/20 shadow-inner shrink-0" 
                        style={{ background: preset.bgColor }}
                        title="Màu nền"
                      />
                      <span 
                        className="w-4 h-4 rounded-full border border-white/20 shadow-inner shrink-0" 
                        style={{ backgroundColor: preset.cardBgColor }}
                        title="Màu thẻ"
                      />
                      <span 
                        className="w-4 h-4 rounded-full border border-white/20 shadow-inner shrink-0" 
                        style={{ backgroundColor: preset.pillBgColor }}
                        title="Màu ô nghĩa"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between mb-4 mt-4">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Settings2 size={18} /> Tùy Chỉnh Chi Tiết Nền & Thẻ
            </h2>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2.5 mb-6 pb-6 border-b border-[var(--border)]">
            <div>
              <label className="block text-[11px] font-bold mb-1 text-[var(--text-muted)] truncate">Nền Video</label>
              <input 
                type="color" 
                value={bgColor.startsWith('linear-gradient') ? '#ED1C24' : bgColor} 
                onChange={e => {
                  setBgColor(e.target.value);
                  setActiveThemeId('custom');
                }} 
                className="w-full h-9 rounded cursor-pointer border border-[var(--border)]" 
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold mb-1 text-slate-700 truncate" title="Khung Tiêu Đề">Khung Tiêu Đề</label>
              <input 
                type="color" 
                value={headerBgGradient.startsWith('linear-gradient') ? '#091C36' : headerBgGradient} 
                onChange={e => {
                  setHeaderBgGradient(e.target.value);
                  setActiveThemeId('custom');
                }} 
                className="w-full h-9 rounded cursor-pointer border border-[var(--border)]" 
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold mb-1 text-cyan-600 truncate" title="Chữ Tiêu Đề">Chữ Tiêu Đề</label>
              <input 
                type="color" 
                value={headerTextColor} 
                onChange={e => {
                  setHeaderTextColor(e.target.value);
                  setActiveThemeId('custom');
                }} 
                className="w-full h-9 rounded cursor-pointer border border-[var(--border)]" 
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold mb-1 text-[var(--text-muted)] truncate">Màu Thẻ</label>
              <input 
                type="color" 
                value={cardBgColor} 
                onChange={e => {
                  setCardBgColor(e.target.value);
                  setActiveThemeId('custom');
                }} 
                className="w-full h-9 rounded cursor-pointer border border-[var(--border)]" 
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold mb-1 text-[var(--text-muted)] truncate">Ô Nghĩa</label>
              <input 
                type="color" 
                value={pillBgColor} 
                onChange={e => {
                  setPillBgColor(e.target.value);
                  setActiveThemeId('custom');
                }} 
                className="w-full h-9 rounded cursor-pointer border border-[var(--border)]" 
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold mb-1 text-[var(--text-muted)] truncate">Media Nền</label>
              <label className="w-full h-9 border border-[var(--border)] rounded flex items-center justify-center cursor-pointer overflow-hidden bg-white hover:bg-[var(--bg-hover)]">
                <input type="file" className="hidden" accept="image/*,video/*" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const isVideo = file.type.startsWith('video/');
                    const url = URL.createObjectURL(file);
                    setBgMedia({ url, type: isVideo ? 'video' : 'image' });
                  }
                }} />
                {bgMedia ? <span className="text-[11px] font-bold text-green-600">Đã tải</span> : <span className="text-[11px] text-[var(--text-muted)]">Tải lên</span>}
              </label>
              {bgMedia && <button onClick={() => setBgMedia(null)} className="text-[10px] text-red-500 mt-1 hover:underline text-center w-full">Xoá nền</button>}
            </div>
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
            {/* Cards Input - only for vocab, sentence, story modes */}
            {(displayMode === 'vocab' || displayMode === 'sentence' || displayMode === 'story') && (
              <div className="grid grid-cols-2 gap-4">
                {cards.map((card, idx) => (
                  <div key={card.id} className="p-4 rounded-lg bg-white border border-[var(--border)] shadow-sm">
                    <div className="font-bold text-sm mb-3 flex items-center justify-between border-b border-[var(--border)] pb-2">
                      <span>{displayMode === 'vocab' ? `Ô từ vựng #${idx + 1}` : `Câu #${idx + 1}`}</span>
                    </div>
                    <div className={`grid ${(displayMode === 'vocab' || displayMode === 'story') ? 'grid-cols-[80px_1fr]' : 'grid-cols-1'} gap-3`}>
                      {(displayMode === 'vocab' || displayMode === 'story') && (
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
                          setCards(prev => {
                            const newCards = [...prev];
                            newCards[idx] = { ...newCards[idx], romaji: e.target.value };
                            return newCards;
                          });
                        }} placeholder="Romaji (Mặt nài nỉ)" />
                        <input type="text" className="input text-xs w-full py-1.5 font-bold text-red-600" value={card.hiragana} onChange={e => {
                          setCards(prev => {
                            const newCards = [...prev];
                            newCards[idx] = { ...newCards[idx], hiragana: e.target.value };
                            return newCards;
                          });
                        }} placeholder="Hiragana (おねがいかお)" />
                        <input type="text" className="input text-xs w-full py-1.5" value={card.meaning} onChange={e => {
                          setCards(prev => {
                            const newCards = [...prev];
                            newCards[idx] = { ...newCards[idx], meaning: e.target.value };
                            return newCards;
                          });
                        }} placeholder="Nghĩa (Mặt nài nỉ)" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quiz Questions Input */}
            {displayMode === 'quiz' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[var(--text-muted)]">Mỗi câu gồm: câu hỏi (tiếng Nhật) + 1 đáp án đúng + 2 đáp án sai</p>
                  <button
                    onClick={() => setQuizQuestions(prev => [...prev, {
                      id: Date.now().toString(),
                      question: '',
                      romaji: '',
                      correct: '',
                      wrongA: '',
                      wrongB: ''
                    }])}
                    className="px-3 py-1.5 bg-orange-500 text-white text-xs font-bold rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    + Thêm câu hỏi
                  </button>
                </div>
                {quizQuestions.map((q, idx) => (
                  <div key={q.id} className="p-4 rounded-xl bg-white border border-orange-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-orange-100">
                      <span className="font-bold text-sm text-orange-700">🎯 Câu {idx + 1}</span>
                      {quizQuestions.length > 1 && (
                        <button onClick={() => setQuizQuestions(prev => prev.filter(x => x.id !== q.id))} className="text-red-400 hover:text-red-600">
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    <div className="flex gap-2 mb-3">
                      <button 
                        onClick={() => setQuizQuestions(prev => prev.map(x => x.id === q.id ? { ...x, type: 'ja-vi' } : x))}
                        className={`flex-1 py-1.5 text-xs font-bold rounded border ${q.type !== 'vi-ja' ? 'bg-orange-100 border-orange-300 text-orange-700 shadow-inner' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}
                      >
                        🇯🇵 Hỏi Nhật ➔ Đáp Việt
                      </button>
                      <button 
                        onClick={() => setQuizQuestions(prev => prev.map(x => x.id === q.id ? { ...x, type: 'vi-ja' } : x))}
                        className={`flex-1 py-1.5 text-xs font-bold rounded border ${q.type === 'vi-ja' ? 'bg-orange-100 border-orange-300 text-orange-700 shadow-inner' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}
                      >
                        🇻🇳 Hỏi Việt ➔ Đáp Nhật
                      </button>
                    </div>

                    <div className="space-y-2">
                      <input
                        type="text"
                        className="input text-sm w-full py-1.5 font-bold text-[#1a1a2e]"
                        value={q.question}
                        onChange={e => setQuizQuestions(prev => prev.map(x => x.id === q.id ? { ...x, question: e.target.value } : x))}
                        placeholder={q.type === 'vi-ja' ? "❓ Câu hỏi - Tiếng Việt (Bạn tên là gì?)" : "❓ Câu hỏi - Tiếng Nhật (おまたせしました)"}
                      />
                      <input
                        type="text"
                        className="input text-sm w-full py-1.5 text-gray-500 italic"
                        value={q.romaji}
                        onChange={e => setQuizQuestions(prev => prev.map(x => x.id === q.id ? { ...x, romaji: e.target.value } : x))}
                        placeholder="🔤 Ghi chú thêm / Romaji (omatase shimashita)"
                      />
                      {q.type !== 'vi-ja' && (
                        <input
                          type="text"
                          className="input text-sm w-full py-1.5 text-blue-700 font-bold bg-blue-50/50 border-blue-200"
                          value={q.questionSuffix !== undefined ? q.questionSuffix : 'nghĩa là gì?'}
                          onChange={e => setQuizQuestions(prev => prev.map(x => x.id === q.id ? { ...x, questionSuffix: e.target.value } : x))}
                          placeholder="✏️ Dòng chữ hỏi bên dưới (Mặc định: nghĩa là gì?)"
                        />
                      )}
                      <input
                        type="text"
                        className="input text-sm w-full py-1.5 text-green-700 font-semibold"
                        value={q.correct}
                        onChange={e => setQuizQuestions(prev => prev.map(x => x.id === q.id ? { ...x, correct: e.target.value } : x))}
                        placeholder={q.type === 'vi-ja' ? "✅ Đáp án ĐÚNG - Tiếng Nhật" : "✅ Đáp án ĐÚNG (Mặt nài nỉ)"}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          className="input text-xs w-full py-1.5 text-red-500"
                          value={q.wrongA}
                          onChange={e => setQuizQuestions(prev => prev.map(x => x.id === q.id ? { ...x, wrongA: e.target.value } : x))}
                          placeholder={q.type === 'vi-ja' ? "❌ Sai 1 - Tiếng Nhật" : "❌ Sai 1 (Nổi giận)"}
                        />
                        <input
                          type="text"
                          className="input text-xs w-full py-1.5 text-red-500"
                          value={q.wrongB}
                          onChange={e => setQuizQuestions(prev => prev.map(x => x.id === q.id ? { ...x, wrongB: e.target.value } : x))}
                          placeholder={q.type === 'vi-ja' ? "❌ Sai 2 - Tiếng Nhật" : "❌ Sai 2 (Sợ hãi)"}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Grammar Config Input */}
            {displayMode === 'grammar' && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold mb-1 text-rose-600">💖 Tiêu đề - Vế chữ Nổi bật (Hồng)</label>
                      <input 
                        type="text" 
                        className="input w-full font-black text-sm text-rose-600 bg-rose-50/50 border-rose-200" 
                        value={grammarTitlePink} 
                        onChange={e => setGrammarTitlePink(e.target.value)} 
                        placeholder="NGỮ PHÁP N3" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1 text-cyan-600">💎 Tiêu đề - Vế chữ Chính (Cyan)</label>
                      <input 
                        type="text" 
                        className="input w-full font-black text-sm text-cyan-700 bg-cyan-50/50 border-cyan-200" 
                        value={grammarTitleCyan} 
                        onChange={e => setGrammarTitleCyan(e.target.value)} 
                        placeholder="SẼ XUẤT HIỆN TRONG ĐỀ THI JLPT" 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold mb-1 text-amber-700">⚡ Cấu trúc Ngữ Pháp</label>
                      <input 
                        type="text" 
                        className="input w-full font-black text-sm bg-amber-50/60 border-amber-300 text-amber-900" 
                        value={grammarPattern} 
                        onChange={e => setGrammarPattern(e.target.value)} 
                        placeholder="V てからでないと" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1 text-blue-700">💡 Giải thích ý nghĩa</label>
                      <input 
                        type="text" 
                        className="input w-full font-bold text-sm bg-blue-50/60 border-blue-300 text-blue-900" 
                        value={grammarMeaning} 
                        onChange={e => setGrammarMeaning(e.target.value)} 
                        placeholder="Nếu chưa...thì không..." 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-700">📝 Danh sách ví dụ minh họa ({grammarExamples.length})</p>
                    <button
                      onClick={() => setGrammarExamples(prev => [...prev, {
                        id: Date.now().toString(),
                        romaji: '',
                        japanese: '',
                        meaning: ''
                      }])}
                      className="px-3 py-1.5 bg-cyan-600 text-white text-xs font-bold rounded-lg hover:bg-cyan-700 transition-colors flex items-center gap-1 shadow-sm"
                    >
                      + Thêm ví dụ
                    </button>
                  </div>

                  {grammarExamples.map((ex, idx) => (
                    <div key={ex.id} className="p-4 rounded-xl bg-white border border-cyan-200 shadow-sm space-y-2">
                      <div className="flex items-center justify-between pb-2 border-b border-cyan-100">
                        <span className="font-bold text-xs text-cyan-800">Ví dụ #{idx + 1}</span>
                        {grammarExamples.length > 1 && (
                          <button onClick={() => setGrammarExamples(prev => prev.filter(x => x.id !== ex.id))} className="text-red-400 hover:text-red-600">
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        className="input text-xs w-full py-1.5 italic text-slate-500"
                        value={ex.romaji}
                        onChange={e => setGrammarExamples(prev => prev.map(x => x.id === ex.id ? { ...x, romaji: e.target.value } : x))}
                        placeholder="🔤 Phiên âm / Romaji (/Kichinto tashikamete kara.../)"
                      />
                      <input
                        type="text"
                        className="input text-sm w-full py-1.5 font-bold text-cyan-950 bg-cyan-50/50"
                        value={ex.japanese}
                        onChange={e => setGrammarExamples(prev => prev.map(x => x.id === ex.id ? { ...x, japanese: e.target.value } : x))}
                        placeholder="🇯🇵 Mẫu câu tiếng Nhật (きちんと確かめてからでないと失敗するよ。)"
                      />
                      <input
                        type="text"
                        className="input text-xs w-full py-1.5 font-semibold text-slate-800"
                        value={ex.meaning}
                        onChange={e => setGrammarExamples(prev => prev.map(x => x.id === ex.id ? { ...x, meaning: e.target.value } : x))}
                        placeholder="🇻🇳 Nghĩa tiếng Việt (Nếu không kiểm tra lại kỹ càng...)"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
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
              background: bgColor.startsWith('linear-gradient') ? bgColor : undefined,
              backgroundColor: bgColor.startsWith('linear-gradient') ? undefined : bgColor
            }}
          >
            {/* Background Media Render */}
            {bgMedia && bgMedia.type === 'image' && (
              <div className="absolute inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: `url(${bgMedia.url})` }} />
            )}
            {bgMedia && bgMedia.type === 'video' && (
              <video src={bgMedia.url} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0" />
            )}
            {bgMedia && (
              <div className="absolute inset-0 z-0 bg-black/10" /> /* Slight overlay for readability */
            )}

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
              <div className="flex-1 w-full px-4 pb-4 flex flex-col z-10 relative justify-center items-center overflow-y-auto">
                <div className="w-full flex flex-col items-center">
                  {/* Title nếu có nhập */}
                  {topicTitle && (
                    <div className="mb-3 flex flex-col items-center gap-1 w-full max-w-[96%]">
                      <div 
                        className="w-full py-2.5 px-6 rounded-2xl text-center border border-slate-700/80 shadow-2xl"
                        style={{
                          background: headerBgGradient.startsWith('linear-gradient') ? headerBgGradient : undefined,
                          backgroundColor: headerBgGradient.startsWith('linear-gradient') ? undefined : headerBgGradient,
                          boxShadow: '0 8px 24px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.15) inset'
                        }}
                      >
                        <h2 
                          className={`font-black text-center tracking-widest uppercase leading-tight ${numCards >= 6 ? 'text-[18px]' : 'text-[24px]'}`}
                          style={{
                            color: headerTextColor,
                            textShadow: `0 2px 8px ${headerTextColor}80`
                          }}
                        >
                          {topicTitle}
                        </h2>
                      </div>
                    </div>
                  )}

                  {/* Cards List với thiết kế Cyan/Theme Card + White Pill gối đè */}
                  <div className={`flex flex-col w-full items-center ${numCards >= 4 ? 'gap-2.5' : 'gap-4'}`}>
                    {cards.map((card) => {
                      const isActive = activeHighlight === card.id;
                      return (
                        <div 
                          key={card.id}
                          className="flex flex-col items-center w-full max-w-[96%] transition-all duration-300"
                        >
                          {/* Top Card */}
                          <div 
                            className={`w-full pt-2.5 pb-4 px-4 rounded-[18px] text-center shadow-md transition-all duration-300 ${
                              isActive 
                                ? 'ring-4 ring-yellow-300 scale-[1.03] shadow-xl' 
                                : ''
                            }`}
                            style={{ 
                              backgroundColor: isActive ? '#FFE600' : cardBgColor,
                              color: (cardBgColor === '#00E5FF' || cardBgColor === '#FFE600') ? '#020617' : '#FFFFFF',
                              boxShadow: isActive ? '0 8px 24px rgba(255,230,0,0.5)' : '0 4px 14px rgba(0,0,0,0.25)'
                            }}
                          >
                            {card.romaji && (
                              <div 
                                className="text-[11.5px] md:text-[13px] font-semibold italic leading-tight mb-0.5 tracking-tight opacity-90"
                                style={{ color: (cardBgColor === '#FFE600' || cardBgColor === '#00E5FF') ? '#002b5b' : '#ffffff' }}
                              >
                                /{card.romaji}/
                              </div>
                            )}
                            <div 
                              className={`font-black leading-snug tracking-tight ${
                                numCards >= 4 ? 'text-[17px] md:text-[20px]' : 'text-[22px] md:text-[26px]'
                              }`}
                            >
                              {card.hiragana}
                            </div>
                          </div>

                          {/* Bottom Pill: Overlapping Pill với Nghĩa */}
                          <div 
                            className="w-[90%] px-4 py-1.5 rounded-full shadow-md text-center border border-slate-100/90 -mt-3 z-10"
                            style={{ 
                              backgroundColor: pillBgColor,
                              color: pillTextColor,
                              boxShadow: '0 3px 10px rgba(0,0,0,0.2)' 
                            }}
                          >
                            <span 
                              className={`font-black leading-tight block truncate ${
                                numCards >= 4 ? 'text-[12.5px] md:text-[14px]' : 'text-[15px] md:text-[17px]'
                              }`}
                              style={{ color: pillTextColor }}
                            >
                              {card.meaning}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Sentence List Container (SENTENCE MODE) */}
            {displayMode === 'sentence' && (
              <div className="flex-1 w-full px-4 pb-4 flex flex-col z-10 relative justify-center items-center overflow-y-auto">
                <div className="w-full flex flex-col items-center">
                  {/* Title với hiệu ứng đẹp */}
                  <div className="mb-4 flex flex-col items-center gap-1 w-full max-w-[96%]">
                    <div 
                      className="w-full py-3 px-6 rounded-2xl text-center border border-slate-700/80 shadow-2xl"
                      style={{
                        background: headerBgGradient.startsWith('linear-gradient') ? headerBgGradient : undefined,
                        backgroundColor: headerBgGradient.startsWith('linear-gradient') ? undefined : headerBgGradient,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.15) inset'
                      }}
                    >
                      <h2 
                        className={`font-black text-center tracking-widest uppercase leading-tight ${numCards >= 4 ? 'text-[22px]' : 'text-[28px]'}`}
                        style={{
                          color: headerTextColor,
                          textShadow: `0 2px 8px ${headerTextColor}80`
                        }}
                      >
                        {topicTitle || 'THỜI GIAN'}
                      </h2>
                    </div>
                  </div>

                  {/* Cards List với thiết kế Cyan + White Pill gối đè */}
                  <div className={`flex flex-col w-full items-center ${numCards >= 4 ? 'gap-2.5' : 'gap-4'}`}>
                    {cards.map((card) => {
                      const isActive = activeHighlight === card.id;
                      return (
                        <div 
                          key={card.id}
                          className="flex flex-col items-center w-full max-w-[96%] transition-all duration-300"
                        >
                          {/* Top Card: Vibrant Theme Background */}
                          <div 
                            className={`w-full pt-2.5 pb-4 px-4 rounded-[18px] text-center shadow-md transition-all duration-300 ${
                              isActive 
                                ? 'ring-4 ring-yellow-300 scale-[1.03] shadow-xl' 
                                : ''
                            }`}
                            style={{ 
                              backgroundColor: isActive ? '#FFE600' : cardBgColor,
                              color: (cardBgColor === '#00E5FF' || cardBgColor === '#FFE600') ? '#020617' : '#FFFFFF',
                              boxShadow: isActive ? '0 8px 24px rgba(255,230,0,0.5)' : '0 4px 14px rgba(0,0,0,0.25)'
                            }}
                          >
                            {card.romaji && (
                              <div 
                                className="text-[11.5px] md:text-[13px] font-semibold italic leading-tight mb-0.5 tracking-tight opacity-90"
                                style={{ color: (cardBgColor === '#FFE600' || cardBgColor === '#00E5FF') ? '#002b5b' : '#ffffff' }}
                              >
                                /{card.romaji}/
                              </div>
                            )}
                            <div 
                              className={`font-black leading-snug tracking-tight ${
                                numCards >= 4 ? 'text-[17px] md:text-[20px]' : 'text-[22px] md:text-[26px]'
                              }`}
                            >
                              {card.hiragana}
                            </div>
                          </div>

                          {/* Bottom Pill: Overlapping Pill với Nghĩa */}
                          <div 
                            className="w-[90%] px-4 py-1.5 rounded-full shadow-md text-center border border-slate-100/90 -mt-3 z-10"
                            style={{ 
                              backgroundColor: pillBgColor,
                              color: pillTextColor,
                              boxShadow: '0 3px 10px rgba(0,0,0,0.2)'
                            }}
                          >
                            <span 
                              className={`font-black leading-tight block truncate ${
                                numCards >= 4 ? 'text-[12.5px] md:text-[14px]' : 'text-[15px] md:text-[17px]'
                              }`}
                              style={{ color: pillTextColor }}
                            >
                              {card.meaning}
                            </span>
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
              <div className="flex-1 w-full px-6 pb-10 flex flex-col items-center justify-center z-10 relative">
                {topicTitle && (
                  <div className="mb-4 px-5 py-1.5 rounded-xl bg-black/30 backdrop-blur-sm border border-white/20">
                    <h2 className="text-sm font-black text-amber-300 tracking-widest uppercase">
                      {topicTitle}
                    </h2>
                  </div>
                )}
                {cards.map((card, idx) => {
                  // Chỉ hiển thị card đang được đọc, hoặc card đầu tiên nếu chưa bắt đầu đọc
                  const isActive = activeHighlight ? (activeHighlight === card.id) : (idx === 0);
                  if (!isActive) return null;

                  return (
                    <div 
                      key={card.id}
                      className="w-full animate-in fade-in zoom-in-95 duration-500 flex justify-center"
                    >
                      {/* Text wrapper with single background box */}
                      <div 
                        className="w-fit max-w-[90%] flex flex-col items-center justify-center gap-2 text-center px-6 py-4 rounded-2xl border border-white/80"
                        style={{
                          background: 'rgba(255,255,255,0.88)',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
                        }}
                      >
                        {card.image && (
                          <img 
                            src={card.image} 
                            alt="" 
                            className="max-h-[140px] object-contain drop-shadow-lg rounded-2xl mb-1 bg-white/40 p-2 border border-white/50" 
                          />
                        )}
                        <div 
                          className={`font-black tracking-widest ${numCards <= 4 ? 'text-[20px]' : 'text-[16px]'}`}
                          style={{ color: textColor }}
                        >
                          {card.hiragana}
                        </div>
                        <div 
                          className={`font-light tracking-widest ${numCards <= 4 ? 'text-[15px]' : 'text-[12px]'}`}
                          style={{ color: textColor, opacity: 0.85 }}
                        >
                          {card.romaji}
                        </div>
                        <div 
                          className={`font-semibold tracking-wide ${numCards <= 4 ? 'text-[20px]' : 'text-[16px]'}`}
                          style={{ color: textColor }}
                        >
                          {card.meaning}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quiz Container (QUIZ MODE) */}
            {displayMode === 'quiz' && (() => {
              const currentQ = quizQuestions[quizIndex] ?? quizQuestions[0];
              const opts = quizOptions.length === 3 ? quizOptions : [currentQ?.correct, currentQ?.wrongA, currentQ?.wrongB];
              return (
                <div className="flex-1 w-full px-4 pb-4 flex flex-col items-center justify-center z-10 relative gap-3">

                  {/* Label Chọn Đáp Án Đúng */}
                  <div 
                    className="px-5 py-1.5 rounded-full flex items-center gap-2"
                    style={{
                      background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)',
                      boxShadow: '0 3px 12px rgba(239,68,68,0.4)'
                    }}
                  >
                    <span style={{ fontSize: '14px' }}>🎯</span>
                    <span className="font-black text-white tracking-widest uppercase text-[13px]">
                      Chọn Đáp Án Đúng
                    </span>
                  </div>

                  {/* Question box — white background, red Japanese text */}
                  <div
                    className="w-full rounded-2xl px-5 py-5 text-center"
                    style={{
                      background: 'rgba(255,255,255,0.92)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
                      border: '2px solid rgba(255,255,255,0.9)'
                    }}
                  >
                    {currentQ?.type === 'vi-ja' ? (
                      <>
                        <div className="text-[26px] font-black leading-tight text-gray-900 mb-2">
                          {currentQ?.question || 'Bạn tên là gì?'}
                        </div>
                        {currentQ?.romaji && (
                          <div className="text-[14px] font-medium text-gray-600 mt-1 italic">
                            ({currentQ?.romaji})
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="text-[32px] font-black leading-tight text-red-600" style={{ fontFamily: 'serif' }}>
                          「{currentQ?.question || 'おねがいかお'}」
                        </div>
                        <div className="text-[13px] font-medium text-gray-600 mt-1 italic">
                          ({currentQ?.romaji || 'omatase shimashita'})
                        </div>
                        <div className="text-[17px] font-black text-gray-900 mt-2">
                          {currentQ?.questionSuffix !== undefined ? currentQ.questionSuffix : 'nghĩa là gì?'}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Answer option bars */}
                  <div className="w-full flex flex-col gap-2.5 mt-1">
                    {opts.map((opt, i) => {
                      const isCorrect = opt === currentQ?.correct;
                      const revealed = quizShowAnswer;
                      return (
                        <div
                          key={i}
                          className="w-full rounded-xl px-5 py-4 text-center transition-all duration-500"
                          style={{
                            background: revealed && isCorrect
                              ? 'rgba(34,197,94,0.92)'
                              : 'rgba(255,255,255,0.88)',
                            boxShadow: revealed && isCorrect
                              ? '0 0 24px rgba(34,197,94,0.5)'
                              : '0 3px 12px rgba(0,0,0,0.15)',
                            border: revealed && isCorrect
                              ? '2px solid #22c55e'
                              : '2px solid rgba(255,255,255,0.9)',
                            transform: revealed && isCorrect ? 'scale(1.02)' : 'scale(1)'
                          }}
                        >
                          <span
                            className="text-[17px] font-bold"
                            style={{ color: revealed && isCorrect ? 'white' : '#1a1a2e' }}
                          >
                            {opt}
                            {revealed && isCorrect && ' ✅'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Countdown circle at bottom */}
                  <div className="flex items-center justify-center mt-2">
                    {quizCountdown !== null ? (
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center text-[36px] font-black transition-all duration-300"
                        style={{
                          background: quizCountdown === 0 ? '#22c55e' : quizCountdown === 1 ? '#ef4444' : 'rgba(255,255,255,0.85)',
                          color: quizCountdown <= 1 ? 'white' : '#1a1a2e',
                          boxShadow: quizCountdown === 0 ? '0 0 24px rgba(34,197,94,0.6)' : quizCountdown === 1 ? '0 0 24px rgba(239,68,68,0.5)' : '0 4px 16px rgba(0,0,0,0.2)',
                          transform: `scale(${quizCountdown === 0 ? 1.2 : 1})`
                        }}
                      >
                        {quizCountdown}
                      </div>
                    ) : (
                      !quizShowAnswer && (
                        <div className="text-[14px] font-bold text-center px-4 py-2 rounded-full"
                          style={{ background: 'rgba(255,255,255,0.7)', color: '#1a1a2e' }}>
                          ⏳ Nhấn Nghe thử để bắt đầu
                        </div>
                      )
                    )}
                  </div>

                </div>
              );
            })()}

            {/* Grammar Container (GRAMMAR MODE) */}
            {displayMode === 'grammar' && (
              <div className="flex-1 w-full px-3 pb-4 flex flex-col items-center justify-between z-10 relative py-2 gap-2.5 overflow-hidden">
                
                {/* 1. Header Title Box */}
                <div 
                  className="w-full rounded-2xl py-3.5 px-4 text-center border border-slate-700/80 shadow-2xl mt-1"
                  style={{
                    background: headerBgGradient.startsWith('linear-gradient') ? headerBgGradient : undefined,
                    backgroundColor: headerBgGradient.startsWith('linear-gradient') ? undefined : headerBgGradient,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.15) inset'
                  }}
                >
                  <h2 className="text-[17px] md:text-[19px] font-black uppercase tracking-wide leading-snug flex flex-col items-center justify-center gap-0.5">
                    <span className="text-[#FF3366] drop-shadow-[0_2px_8px_rgba(255,51,102,0.6)]">
                      {grammarTitlePink || 'NGỮ PHÁP N3'}
                    </span>
                    <span 
                      className="drop-shadow-[0_2px_8px_rgba(0,229,255,0.6)]"
                      style={{ color: headerTextColor }}
                    >
                      {grammarTitleCyan || 'SẼ XUẤT HIỆN TRONG ĐỀ THI JLPT'}
                    </span>
                  </h2>
                </div>

                {/* 2. Grammar Pattern Pill (Yellow) */}
                <div 
                  className={`w-fit max-w-[92%] bg-[#FFE600] text-slate-950 px-6 py-2 rounded-xl shadow-lg border border-yellow-300 text-center transition-all duration-300 ${
                    activeHighlight === 'grammar-pattern' ? 'scale-105 ring-4 ring-yellow-300 shadow-yellow-300/50' : ''
                  }`}
                  style={{ boxShadow: '0 4px 16px rgba(255,230,0,0.35)' }}
                >
                  <span className="text-[20px] md:text-[22px] font-black tracking-wide text-slate-950">
                    {grammarPattern}
                  </span>
                </div>

                {/* 3. Grammar Meaning Pill */}
                <div 
                  className="w-fit max-w-[95%] px-6 py-1.5 rounded-xl shadow-md text-center border border-slate-100 shrink-0"
                  style={{ backgroundColor: pillBgColor, color: pillTextColor }}
                >
                  <span className="text-[14px] md:text-[15px] font-black tracking-wide block" style={{ color: pillTextColor }}>
                    {grammarMeaning}
                  </span>
                </div>

                {/* 4. Examples List (Theme cards & Overlapping pills) */}
                <div className="w-full flex flex-col gap-2.5 my-auto overflow-y-auto px-1 py-1">
                  {grammarExamples.map((ex) => {
                    const isActive = activeHighlight === ex.id;
                    return (
                      <div key={ex.id} className="flex flex-col items-center w-full mb-1">
                        {/* Theme Card */}
                        <div 
                          className={`w-full text-slate-950 pt-2 pb-3.5 px-3 rounded-[16px] text-center shadow-md transition-all duration-300 ${
                            isActive ? 'ring-4 ring-yellow-300 scale-[1.02] shadow-xl' : ''
                          }`}
                          style={{ 
                            backgroundColor: isActive ? '#FFE600' : cardBgColor,
                            color: (cardBgColor === '#00E5FF' || cardBgColor === '#FFE600') ? '#020617' : '#FFFFFF',
                            boxShadow: isActive ? '0 8px 24px rgba(255,230,0,0.5)' : '0 4px 14px rgba(0,0,0,0.25)' 
                          }}
                        >
                          {ex.romaji && (
                            <div 
                              className="text-[11px] font-semibold italic leading-tight mb-0.5 tracking-tight opacity-90"
                              style={{ color: (cardBgColor === '#FFE600' || cardBgColor === '#00E5FF') ? '#002244' : '#ffffff' }}
                            >
                              {ex.romaji}
                            </div>
                          )}
                          <div className="text-[13.5px] md:text-[15px] font-black leading-snug tracking-tight">
                            {ex.japanese}
                          </div>
                        </div>

                        {/* Overlapping Meaning Pill */}
                        <div 
                          className="w-[92%] px-3 py-1 rounded-full shadow-md text-center border border-slate-100 -mt-2.5 z-10"
                          style={{ 
                            backgroundColor: pillBgColor,
                            color: pillTextColor,
                            boxShadow: '0 3px 8px rgba(0,0,0,0.18)' 
                          }}
                        >
                          <span className="text-[11px] md:text-[12.5px] font-black leading-tight block" style={{ color: pillTextColor }}>
                            {ex.meaning}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

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
