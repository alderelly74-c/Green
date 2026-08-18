import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Send, Zap, Sparkles, MessageSquare, RefreshCw, 
  Globe, MapPin, Gauge, Brain, Search, Lightbulb, CheckCircle2,
  Volume2, Eye, Upload, ShieldAlert, Wrench, DollarSign, Play, Pause,
  Download, FileText, AlertCircle, Cpu, Mic, MicOff, Radio, VolumeX,
  UserCheck, Bike, ArrowUpRight
} from 'lucide-react';
import { Driver, Vehicle } from '../types';

interface ExecutedAction {
  action: string;
  result?: string;
  error?: string;
}

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  time: string;
  model?: string;
  executedActions?: ExecutedAction[];
}

type DictationTarget = 'chat' | 'speech' | 'vision' | 'search' | 'maps' | 'fast' | 'thinking';

export interface RecognizedVoiceCommand {
  intent: 'payout' | 'workOrder' | 'fuel' | 'ev' | 'message' | 'newVehicle' | 'unknown';
  driver?: Driver | null;
  vehicle?: Vehicle | null;
  confidence: number;
  displayText: string;
  actionSummary: string;
  originalPhrase: string;
}

export const parseVoiceCommandIntent = (
  rawText: string,
  drivers: Driver[] = [],
  vehicles: Vehicle[] = []
): RecognizedVoiceCommand | null => {
  if (!rawText || rawText.trim().length < 3) return null;

  const text = rawText.toLowerCase().trim();

  // 1. Find Driver in text
  let matchedDriver: Driver | null = null;
  for (const d of drivers) {
    const fullNameLower = d.fullName.toLowerCase();
    const parts = fullNameLower.split(' ');
    const firstName = parts[0] || '';
    const lastName = parts[1] || '';

    if (
      text.includes(fullNameLower) ||
      (firstName.length >= 3 && text.includes(firstName)) ||
      (lastName.length >= 3 && text.includes(lastName))
    ) {
      matchedDriver = d;
      break;
    }
  }

  // 2. Find Vehicle in text
  let matchedVehicle: Vehicle | null = null;
  for (const v of vehicles) {
    const regOriginal = v.registrationNumber.toLowerCase();
    const regClean = regOriginal.replace(/\s+/g, '');
    const textClean = text.replace(/\s+/g, '');

    if (
      text.includes(regOriginal) ||
      textClean.includes(regClean) ||
      (v.make && text.includes(v.make.toLowerCase())) ||
      (v.model && text.includes(v.model.toLowerCase()))
    ) {
      matchedVehicle = v;
      break;
    }
  }

  // Cross-reference fallbacks
  if (matchedVehicle && !matchedDriver && matchedVehicle.assignedDriverId) {
    matchedDriver = drivers.find(d => d.id === matchedVehicle?.assignedDriverId) || null;
  }
  if (matchedDriver && !matchedVehicle && matchedDriver.assignedVehicleId) {
    matchedVehicle = vehicles.find(v => v.id === matchedDriver?.assignedVehicleId) || null;
  }

  // A. Payout / M-Pesa Disburse
  if (
    text.includes('payout') ||
    text.includes('pay') ||
    text.includes('disburse') ||
    text.includes('mpesa') ||
    text.includes('m-pesa') ||
    text.includes('send money') ||
    text.includes('earnings')
  ) {
    return {
      intent: 'payout',
      driver: matchedDriver,
      vehicle: matchedVehicle,
      confidence: matchedDriver ? 0.98 : 0.8,
      displayText: matchedDriver
        ? `Open M-Pesa Payout for ${matchedDriver.fullName}`
        : 'Open M-Pesa Payout Modal',
      actionSummary: matchedDriver
        ? `Pre-filling payout modal for driver ${matchedDriver.fullName} (${matchedDriver.phone}, Outstanding: KES ${matchedDriver.outstandingBalanceKes.toLocaleString()})`
        : 'Opening M-Pesa payout modal',
      originalPhrase: rawText
    };
  }

  // B. Work Order / Maintenance
  if (
    text.includes('work order') ||
    text.includes('maintenance') ||
    text.includes('repair') ||
    text.includes('service') ||
    text.includes('garage') ||
    text.includes('fix') ||
    text.includes('breakdown')
  ) {
    return {
      intent: 'workOrder',
      vehicle: matchedVehicle,
      driver: matchedDriver,
      confidence: matchedVehicle ? 0.98 : 0.8,
      displayText: matchedVehicle
        ? `Create Work Order for ${matchedVehicle.registrationNumber} (${matchedVehicle.make} ${matchedVehicle.model})`
        : 'Create Maintenance Work Order',
      actionSummary: matchedVehicle
        ? `Pre-filling maintenance work order modal for asset ${matchedVehicle.registrationNumber}`
        : 'Opening workshop maintenance modal',
      originalPhrase: rawText
    };
  }

  // C. Record Fuel
  if (
    text.includes('fuel') ||
    text.includes('petrol') ||
    text.includes('diesel') ||
    text.includes('gas station') ||
    text.includes('refill')
  ) {
    return {
      intent: 'fuel',
      vehicle: matchedVehicle,
      driver: matchedDriver,
      confidence: (matchedVehicle || matchedDriver) ? 0.98 : 0.8,
      displayText: matchedVehicle
        ? `Record Fuel Refill for ${matchedVehicle.registrationNumber}`
        : matchedDriver
        ? `Record Fuel Refill for ${matchedDriver.fullName}`
        : 'Record Fuel Transaction',
      actionSummary: `Pre-filling fuel log modal for ${matchedVehicle ? matchedVehicle.registrationNumber : matchedDriver ? matchedDriver.fullName : 'selected vehicle'}`,
      originalPhrase: rawText
    };
  }

  // D. Record EV Charging
  if (
    text.includes('ev') ||
    text.includes('charging') ||
    text.includes('charge') ||
    text.includes('battery swap') ||
    text.includes('swap station')
  ) {
    return {
      intent: 'ev',
      vehicle: matchedVehicle,
      driver: matchedDriver,
      confidence: (matchedVehicle || matchedDriver) ? 0.98 : 0.8,
      displayText: matchedVehicle
        ? `Record EV Charging for ${matchedVehicle.registrationNumber}`
        : 'Record EV Charging / Battery Swap',
      actionSummary: `Pre-filling EV battery session modal for ${matchedVehicle ? matchedVehicle.registrationNumber : 'electric vehicle'}`,
      originalPhrase: rawText
    };
  }

  // E. Message Driver
  if (
    text.includes('message') ||
    text.includes('text') ||
    text.includes('dispatch alert') ||
    text.includes('notify driver') ||
    text.includes('send alert')
  ) {
    return {
      intent: 'message',
      driver: matchedDriver,
      confidence: matchedDriver ? 0.98 : 0.8,
      displayText: matchedDriver
        ? `Open Message Composer for ${matchedDriver.fullName}`
        : 'Open Dispatcher Message Composer',
      actionSummary: matchedDriver
        ? `Navigating to Mobile Dispatch messaging pre-selected for driver ${matchedDriver.fullName}`
        : 'Opening dispatcher mobile alert tab',
      originalPhrase: rawText
    };
  }

  // F. Register New Vehicle
  if (
    text.includes('new vehicle') ||
    text.includes('register vehicle') ||
    text.includes('add vehicle') ||
    text.includes('new bike')
  ) {
    return {
      intent: 'newVehicle',
      confidence: 0.95,
      displayText: 'Register New Fleet Vehicle',
      actionSummary: 'Opening new vehicle registration modal',
      originalPhrase: rawText
    };
  }

  // Fallback match if driver or vehicle explicitly identified in spoken query
  if (matchedDriver || matchedVehicle) {
    if (matchedDriver) {
      return {
        intent: 'payout',
        driver: matchedDriver,
        vehicle: matchedVehicle,
        confidence: 0.85,
        displayText: `Open M-Pesa Payout for ${matchedDriver.fullName}`,
        actionSummary: `Identified driver ${matchedDriver.fullName}. Pre-filling M-Pesa Payout Modal.`,
        originalPhrase: rawText
      };
    }
    if (matchedVehicle) {
      return {
        intent: 'workOrder',
        vehicle: matchedVehicle,
        driver: matchedDriver,
        confidence: 0.85,
        displayText: `Open Work Order for ${matchedVehicle.registrationNumber}`,
        actionSummary: `Identified vehicle ${matchedVehicle.registrationNumber}. Pre-filling Maintenance Work Order.`,
        originalPhrase: rawText
      };
    }
  }

  return null;
};

interface AiFleetAssistantProps {
  drivers?: Driver[];
  vehicles?: Vehicle[];
  onOpenMpesaPayoutModal?: (driver?: Driver | null) => void;
  onOpenWorkOrderModal?: (vehicle?: Vehicle | null) => void;
  onOpenRecordFuelModal?: (vehicle?: Vehicle | null, driver?: Driver | null) => void;
  onOpenRecordEvModal?: (vehicle?: Vehicle | null) => void;
  onOpenNewVehicleModal?: () => void;
  onOpenMessageComposer?: (driver?: Driver | null) => void;
}

export const AiFleetAssistant: React.FC<AiFleetAssistantProps> = ({
  drivers = [],
  vehicles = [],
  onOpenMpesaPayoutModal,
  onOpenWorkOrderModal,
  onOpenRecordFuelModal,
  onOpenRecordEvModal,
  onOpenNewVehicleModal,
  onOpenMessageComposer
}) => {
  const [activeMode, setActiveMode] = useState<DictationTarget>('chat');

  // Voice Command Auto-Fill Recognition State
  const [recognizedVoiceAction, setRecognizedVoiceAction] = useState<{
    command: RecognizedVoiceCommand;
    timestamp: string;
  } | null>(null);

  // Microphone Speech-to-Text State
  const [isListening, setIsListening] = useState(false);
  const [listeningTarget, setListeningTarget] = useState<DictationTarget | null>(null);
  const [micSupported, setMicSupported] = useState<boolean>(true);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [speechLanguage, setSpeechLanguage] = useState<'en-KE' | 'sw-KE' | 'en-US'>('en-KE');
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  // Mode 1: Multi-Turn Chatbot + Agent Tool Calling
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      sender: 'ai',
      text: "Hujambo! I am GreenShift AI Dispatch Agent. I can answer questions AND directly perform actions on your fleet database — such as setting vehicles to Under Maintenance, disbursing M-Pesa payouts, or suspending drivers. Tap the microphone icon anytime to dictate commands via voice!",
      time: new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }),
      model: 'gemini-3.6-flash'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Mode 2: TTS Voice Dispatcher
  const [speechPrompt, setSpeechPrompt] = useState('Attention Driver Juma Omondi: Please proceed to Kilimani B-04 Station immediately for battery swap. Current battery SoC is 12%.');
  const [speechVoice, setSpeechVoice] = useState('Zephyr');
  const [speechAudioBase64, setSpeechAudioBase64] = useState<string | null>(null);
  const [speechMimeType, setSpeechMimeType] = useState('audio/mp3');
  const [speechLoading, setSpeechLoading] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Mode 3: Vision Inspection
  const [selectedPresetImage, setSelectedPresetImage] = useState<'battery' | 'tire' | 'receipt' | 'dent' | 'custom'>('battery');
  const [visionImageBase64, setVisionImageBase64] = useState<string>('');
  const [visionPrompt, setVisionPrompt] = useState('Analyze this vehicle photo or receipt for defects, wear rating, estimated repair cost in KES, and recommended fleet action.');
  const [visionResult, setVisionResult] = useState<string | null>(null);
  const [visionLoading, setVisionLoading] = useState(false);

  // Mode 4: Search Grounding State
  const [searchPrompt, setSearchPrompt] = useState('Current EPRA Kenya petrol and diesel prices and EV charging tariffs 2026');
  const [searchResult, setSearchResult] = useState<string | null>(null);
  const [searchChunks, setSearchChunks] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Mode 5: Maps Grounding State
  const [mapsPrompt, setMapsPrompt] = useState('EV battery swapping stations and rapid charging hubs in Kilimani, Westlands, and JKIA Nairobi');
  const [mapsResult, setMapsResult] = useState<string | null>(null);
  const [mapsLoading, setMapsLoading] = useState(false);

  // Mode 6: Fast Reply State
  const [fastPrompt, setFastPrompt] = useState('Generate a 1-sentence urgent battery swap message for driver with 12% battery');
  const [fastResult, setFastResult] = useState<string | null>(null);
  const [fastLoading, setFastLoading] = useState(false);

  // Mode 7: Deep Thinking State
  const [thinkingPrompt, setThinkingPrompt] = useState('Perform a comprehensive financial, fuel fraud detection, and EV transition ROI analysis for Nairobi and Mombasa fleets.');
  const [thinkingResult, setThinkingResult] = useState<string | null>(null);
  const [thinkingLoading, setThinkingLoading] = useState(false);

  const suggestedChatPrompts = [
    "Schedule vehicle KMG 482E for Under Maintenance inspection",
    "Disburse KES 3500 M-Pesa payout to driver Juma Omondi",
    "Compare electric motorcycles vs fuel boda bodas profitability.",
    "Niambie status ya EV batteries zote leo."
  ];

  // Detect Web Speech API Availability
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicSupported(false);
    } else {
      setMicSupported(true);
    }
  }, []);

  // Timer for active speech recording
  useEffect(() => {
    if (isListening) {
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingSeconds(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isListening]);

  // Start Speech-to-Text Dictation
  const startListening = (target: DictationTarget) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setSpeechError('Speech recognition is not supported natively in this browser window. You can use the Quick Dictation Presets below to simulate voice commands!');
      setMicSupported(false);
      return;
    }

    setSpeechError(null);
    setListeningTarget(target);

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = speechLanguage;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcriptAcc = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            transcriptAcc += event.results[i][0].transcript;
          }
        }

        if (transcriptAcc) {
          const textToAppend = transcriptAcc.trim();
          appendToTargetInput(target, textToAppend);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition event error:', event.error);
        setIsListening(false);
        setListeningTarget(null);
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone permission blocked or denied by browser. Please grant microphone access in the address bar.');
        } else if (event.error === 'no-speech') {
          setSpeechError('No speech was detected. Please speak clearly into your microphone.');
        } else {
          setSpeechError(`Dictation status: ${event.error}. Try using the Quick Dictation Presets below.`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setListeningTarget(null);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to launch speech recognition:', err);
      setIsListening(false);
      setListeningTarget(null);
      setSpeechError('Could not initialize microphone audio stream. Try using the Quick Dictation Presets.');
    }
  };

  // Stop Speech Dictation
  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // ignore abort errors
      }
    }
    setIsListening(false);
    setListeningTarget(null);
  };

  // Process Voice Command Modal Pre-filling & Triggering
  const processVoiceCommandModalIntent = (text: string) => {
    const cmd = parseVoiceCommandIntent(text, drivers, vehicles);
    if (!cmd) return;

    const timeStr = new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });

    setRecognizedVoiceAction({
      command: cmd,
      timestamp: timeStr
    });

    // Auto-trigger corresponding modal
    if (cmd.intent === 'payout') {
      onOpenMpesaPayoutModal?.(cmd.driver);
    } else if (cmd.intent === 'workOrder') {
      onOpenWorkOrderModal?.(cmd.vehicle);
    } else if (cmd.intent === 'fuel') {
      onOpenRecordFuelModal?.(cmd.vehicle, cmd.driver);
    } else if (cmd.intent === 'ev') {
      onOpenRecordEvModal?.(cmd.vehicle);
    } else if (cmd.intent === 'message') {
      onOpenMessageComposer?.(cmd.driver);
    } else if (cmd.intent === 'newVehicle') {
      onOpenNewVehicleModal?.();
    }

    // Append AI Confirmation Entry in Chat Log
    const confirmationText = `🎤 **Voice Command Recognized:** "${cmd.originalPhrase}"\n\n✅ **Target:** ${
      cmd.driver
        ? `Driver **${cmd.driver.fullName}** (${cmd.driver.phone}, Outstanding: KES ${cmd.driver.outstandingBalanceKes.toLocaleString()})`
        : cmd.vehicle
        ? `Vehicle **${cmd.vehicle.registrationNumber}** (${cmd.vehicle.make} ${cmd.vehicle.model})`
        : 'Fleet System'
    }\n⚡ **Action Executed:** Pre-filled and launched **${cmd.displayText}** modal automatically.`;

    setChatMessages(prev => [
      ...prev,
      {
        sender: 'ai',
        text: confirmationText,
        time: timeStr,
        model: 'gemini-voice-intent-parser',
        executedActions: [
          {
            action: `Voice Command (${cmd.intent})`,
            result: `Pre-filled ${cmd.displayText} for ${cmd.driver?.fullName || cmd.vehicle?.registrationNumber || 'Fleet'}`
          }
        ]
      }
    ]);
  };

  // Helper to append transcribed or dictated text to the target state input
  const appendToTargetInput = (target: DictationTarget, textToAppend: string) => {
    if (target === 'chat') {
      setChatInput(prev => (prev ? `${prev} ${textToAppend}` : textToAppend));
    } else if (target === 'speech') {
      setSpeechPrompt(prev => (prev ? `${prev} ${textToAppend}` : textToAppend));
    } else if (target === 'vision') {
      setVisionPrompt(prev => (prev ? `${prev} ${textToAppend}` : textToAppend));
    } else if (target === 'search') {
      setSearchPrompt(prev => (prev ? `${prev} ${textToAppend}` : textToAppend));
    } else if (target === 'maps') {
      setMapsPrompt(prev => (prev ? `${prev} ${textToAppend}` : textToAppend));
    } else if (target === 'fast') {
      setFastPrompt(prev => (prev ? `${prev} ${textToAppend}` : textToAppend));
    } else if (target === 'thinking') {
      setThinkingPrompt(prev => (prev ? `${prev} ${textToAppend}` : textToAppend));
    }

    // Trigger voice entity parsing
    processVoiceCommandModalIntent(textToAppend);
  };

  // Simulate Dictation Sample for environments without mic or quick test
  const handleSimulateDictation = (target: DictationTarget, phrase: string) => {
    setIsListening(true);
    setListeningTarget(target);
    setTimeout(() => {
      appendToTargetInput(target, phrase);
      setIsListening(false);
      setListeningTarget(null);
    }, 1200);
  };

  // Helper to generate sample canvas image data URL
  const generateSampleImageDataUrl = (type: string): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    if (type === 'battery') {
      // Draw EV Battery with corrosion
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 320, 240);
      ctx.fillStyle = '#1e293b';
      ctx.roundRect(40, 40, 240, 160, 12);
      ctx.fill();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 4;
      ctx.stroke();
      // Battery Terminals
      ctx.fillStyle = '#ef4444'; ctx.fillRect(70, 20, 40, 20); // Positive
      ctx.fillStyle = '#3b82f6'; ctx.fillRect(210, 20, 40, 20); // Negative
      // Corrosion visual mark
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath(); ctx.arc(90, 45, 18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('EV BATTERY TERMINAL #BAT-RM-908', 45, 120);
      ctx.fillStyle = '#fbbf24';
      ctx.font = '12px sans-serif';
      ctx.fillText('⚠ Corrosion & Voltage Sag Detected', 55, 150);
    } else if (type === 'tire') {
      // Draw worn motorcycle tire
      ctx.fillStyle = '#18181b';
      ctx.fillRect(0, 0, 320, 240);
      ctx.strokeStyle = '#52525b';
      ctx.lineWidth = 20;
      ctx.beginPath(); ctx.arc(160, 120, 80, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(160, 120, 80, 0, Math.PI * 0.8); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('ROAM MOTORCYCLE REAR TIRE', 60, 120);
      ctx.fillStyle = '#f87171';
      ctx.font = '11px sans-serif';
      ctx.fillText('Tread Depth: 1.2mm (Below 1.6mm Limit)', 50, 145);
    } else if (type === 'receipt') {
      // Draw M-Pesa Receipt
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 320, 240);
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(0, 0, 320, 35);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('M-PESA CONFIRMATION RECEIPT', 40, 22);
      ctx.fillStyle = '#334155';
      ctx.font = '12px monospace';
      ctx.fillText('Receipt No: SFG882910K', 20, 65);
      ctx.fillText('Sent to: Juma Omondi (+2547123...)', 20, 90);
      ctx.fillText('Amount: KES 18,500.00', 20, 115);
      ctx.fillText('Date: 2026-08-11 11:42 AM', 20, 140);
      ctx.fillText('Reason: Weekly Driver Payout', 20, 165);
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(20, 185, 280, 30);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('✓ VERIFIED BY GREENSHIFT FINANCE', 35, 205);
    } else {
      // Dent / Body Damage
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, 0, 320, 240);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(40, 60, 240, 120);
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 3;
      ctx.strokeRect(100, 80, 100, 60);
      ctx.fillStyle = '#fca5a5';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('FRONT BUMPER COLLISION IMPACT', 55, 115);
      ctx.fillStyle = '#ffffff';
      ctx.font = '11px sans-serif';
      ctx.fillText('Toyota Fielder KCT 302Y Bodywork', 60, 140);
    }

    return canvas.toDataURL('image/jpeg', 0.85);
  };

  // Initialize sample preset image on load
  useEffect(() => {
    const dataUrl = generateSampleImageDataUrl('battery');
    setVisionImageBase64(dataUrl.split(',')[1] || '');
  }, []);

  // Handle Preset Image Change
  const handleSelectPresetImage = (preset: 'battery' | 'tire' | 'receipt' | 'dent') => {
    setSelectedPresetImage(preset);
    const dataUrl = generateSampleImageDataUrl(preset);
    setVisionImageBase64(dataUrl.split(',')[1] || '');
  };

  // Handle Custom Image Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setVisionImageBase64(result.split(',')[1] || '');
        setSelectedPresetImage('custom');
      };
      reader.readAsDataURL(file);
    }
  };

  // Handler for Multi-turn Chat & Function Calling
  const handleSendChat = async (promptToSend?: string) => {
    const text = promptToSend || chatInput;
    if (!text.trim() || chatLoading) return;

    const userTime = new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
    setChatMessages(prev => [...prev, { sender: 'user', text, time: userTime }]);
    if (!promptToSend) setChatInput('');
    setChatLoading(true);

    try {
      const history = chatMessages.map(m => ({ role: m.sender === 'user' ? 'user' : 'model', content: m.text }));
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, message: text })
      });
      const data = await res.json();
      const aiTime = new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
      
      if (data.success) {
        setChatMessages(prev => [...prev, { 
          sender: 'ai', 
          text: data.reply, 
          time: aiTime, 
          model: data.model || 'gemini-3.6-flash',
          executedActions: data.executedActions || []
        }]);
      } else {
        setChatMessages(prev => [...prev, { sender: 'ai', text: `Error: ${data.error || 'Failed to communicate with AI.'}`, time: aiTime }]);
      }
    } catch (err: any) {
      setChatMessages(prev => [...prev, { 
        sender: 'ai', 
        text: "Network error communicating with GreenShift AI endpoint.", 
        time: new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) 
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Handler for TTS Voice Speech
  const handleGenerateSpeech = async () => {
    if (!speechPrompt.trim() || speechLoading) return;
    setSpeechLoading(true);
    setSpeechAudioBase64(null);

    try {
      const res = await fetch('/api/ai/tts-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: speechPrompt, voiceName: speechVoice })
      });
      const data = await res.json();
      if (data.success && data.audioData) {
        setSpeechAudioBase64(data.audioData);
        setSpeechMimeType(data.mimeType || 'audio/mp3');
        // Auto play generated voice
        playAudioFromBase64(data.audioData, data.mimeType);
      } else {
        alert(data.error || 'Failed to generate speech audio.');
      }
    } catch (err: any) {
      alert("Error contacting TTS voice endpoint.");
    } finally {
      setSpeechLoading(false);
    }
  };

  // Play Audio Helper
  const playAudioFromBase64 = (base64Data: string, mimeType: string = 'audio/mp3') => {
    try {
      setIsPlayingAudio(true);
      if (mimeType.includes('pcm')) {
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const int16Array = new Int16Array(byteNumbers.buffer);
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const buffer = audioCtx.createBuffer(1, int16Array.length, 24000);
        const channelData = buffer.getChannelData(0);
        for (let i = 0; i < int16Array.length; i++) {
          channelData[i] = int16Array[i] / 32768;
        }
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        source.onended = () => setIsPlayingAudio(false);
        source.start();
      } else {
        const audio = new Audio(`data:${mimeType};base64,${base64Data}`);
        audio.onended = () => setIsPlayingAudio(false);
        audio.play();
      }
    } catch (err) {
      console.error("Audio playback error:", err);
      setIsPlayingAudio(false);
    }
  };

  // Handler for Vision Inspection
  const handleRunVisionInspection = async () => {
    if (!visionImageBase64 || visionLoading) return;
    setVisionLoading(true);
    setVisionResult(null);

    try {
      const res = await fetch('/api/ai/vision-inspection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imageBase64: visionImageBase64,
          mimeType: 'image/jpeg',
          prompt: visionPrompt
        })
      });
      const data = await res.json();
      if (data.success) {
        setVisionResult(data.reply);
      } else {
        setVisionResult(`Vision Error: ${data.error}`);
      }
    } catch (err: any) {
      setVisionResult("Error executing vision inspection query.");
    } finally {
      setVisionLoading(false);
    }
  };

  // Handler for Search Grounding
  const handleRunSearchGrounding = async () => {
    if (!searchPrompt.trim() || searchLoading) return;
    setSearchLoading(true);
    setSearchResult(null);
    setSearchChunks([]);

    try {
      const res = await fetch('/api/ai/search-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: searchPrompt })
      });
      const data = await res.json();
      if (data.success) {
        setSearchResult(data.reply);
        setSearchChunks(data.groundingChunks || []);
      } else {
        setSearchResult(`Search Grounding Error: ${data.error}`);
      }
    } catch (err: any) {
      setSearchResult("Error executing Search Grounding query.");
    } finally {
      setSearchLoading(false);
    }
  };

  // Handler for Maps Grounding
  const handleRunMapsGrounding = async () => {
    if (!mapsPrompt.trim() || mapsLoading) return;
    setMapsLoading(true);
    setMapsResult(null);

    try {
      const res = await fetch('/api/ai/maps-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: mapsPrompt })
      });
      const data = await res.json();
      if (data.success) {
        setMapsResult(data.reply);
      } else {
        setMapsResult(`Maps Grounding Error: ${data.error}`);
      }
    } catch (err: any) {
      setMapsResult("Error executing Maps Grounding query.");
    } finally {
      setMapsLoading(false);
    }
  };

  // Handler for Fast Low-Latency
  const handleRunFastReply = async () => {
    if (!fastPrompt.trim() || fastLoading) return;
    setFastLoading(true);
    setFastResult(null);

    try {
      const res = await fetch('/api/ai/fast-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: fastPrompt })
      });
      const data = await res.json();
      if (data.success) {
        setFastResult(data.reply);
      } else {
        setFastResult(`Fast Reply Error: ${data.error}`);
      }
    } catch (err: any) {
      setFastResult("Error executing Fast Low-Latency request.");
    } finally {
      setFastLoading(false);
    }
  };

  // Handler for Deep Thinking Mode
  const handleRunThinking = async () => {
    if (!thinkingPrompt.trim() || thinkingLoading) return;
    setThinkingLoading(true);
    setThinkingResult(null);

    try {
      const res = await fetch('/api/ai/deep-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: thinkingPrompt })
      });
      const data = await res.json();
      if (data.success) {
        setThinkingResult(data.reply);
      } else {
        setThinkingResult(`Deep Analysis Error: ${data.error}`);
      }
    } catch (err: any) {
      setThinkingResult("Error executing Deep Thinking audit.");
    } finally {
      setThinkingLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-md">
            <Zap className="w-7 h-7 fill-current" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              GreenShift AI Intelligence Hub
              <span className="px-2.5 py-0.5 text-[10px] bg-emerald-100 text-emerald-800 rounded-full font-bold border border-emerald-200">
                Gemini Multi-Modal Platform
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Microphone Voice Dictation, Agent Actions, Voice Dispatch TTS, Vision Inspection & Thinking Audits</p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="bg-slate-100 p-1.5 rounded-xl border border-slate-200 flex flex-wrap gap-1 w-full lg:w-auto">
          <button
            onClick={() => setActiveMode('chat')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeMode === 'chat' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-emerald-600" />
            <span>Agent Chat</span>
          </button>

          <button
            onClick={() => setActiveMode('speech')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeMode === 'speech' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Voice Dispatch</span>
          </button>

          <button
            onClick={() => setActiveMode('vision')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeMode === 'vision' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-amber-600" />
            <span>Vision Defect</span>
          </button>

          <button
            onClick={() => setActiveMode('search')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeMode === 'search' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <span>Search</span>
          </button>

          <button
            onClick={() => setActiveMode('maps')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeMode === 'maps' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-rose-600" />
            <span>Maps</span>
          </button>

          <button
            onClick={() => setActiveMode('fast')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeMode === 'fast' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Gauge className="w-3.5 h-3.5 text-amber-500" />
            <span>Fast</span>
          </button>

          <button
            onClick={() => setActiveMode('thinking')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeMode === 'thinking' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-purple-600" />
            <span>Thinking</span>
          </button>
        </div>
      </div>

      {/* GLOBAL MICROPHONE SPEECH DICTATION BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
              isListening ? 'bg-rose-600 animate-pulse text-white shadow-lg shadow-rose-600/50' : 'bg-slate-800 text-emerald-400'
            }`}>
              {isListening ? <Radio className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-xs font-bold flex items-center gap-2">
                Speech-to-Text Dictation Engine
                {isListening && (
                  <span className="px-2 py-0.5 text-[9px] bg-rose-500 text-white font-mono rounded-full animate-bounce">
                    REC {recordingSeconds}s
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isListening ? (
                  <span className="text-emerald-400 font-semibold animate-pulse">
                    Listening for voice dictation for <strong className="uppercase">{listeningTarget}</strong> input...
                  </span>
                ) : (
                  <span>Dictate fleet commands, alerts, or queries directly via microphone.</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {/* Language Selector */}
            <select
              value={speechLanguage}
              onChange={(e) => setSpeechLanguage(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none"
            >
              <option value="en-KE">English (KE)</option>
              <option value="sw-KE">Swahili (KE)</option>
              <option value="en-US">English (US)</option>
            </select>

            {isListening ? (
              <button
                onClick={stopListening}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-1.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm"
              >
                <MicOff className="w-3.5 h-3.5" />
                <span>Stop Dictation</span>
              </button>
            ) : (
              <button
                onClick={() => startListening(activeMode)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-1.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Start Microphone ({activeMode})</span>
              </button>
            )}
          </div>
        </div>

        {speechError && (
          <div className="bg-amber-950/80 border border-amber-700/60 text-amber-200 p-2.5 rounded-xl text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{speechError}</span>
            </div>
            <button
              onClick={() => setSpeechError(null)}
              className="text-amber-400 font-bold hover:text-white text-xs px-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Quick Voice Simulation Shortcuts & Auto-Fill Presets */}
        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-2">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Voice Dictation Presets:</span>
          
          <button
            onClick={() => handleSimulateDictation('chat', 'Open M-Pesa payout for Juma Omondi')}
            className="bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-white px-2.5 py-1 rounded-lg text-[11px] font-mono transition flex items-center gap-1 border border-slate-700"
          >
            <Mic className="w-3 h-3 text-emerald-400" />
            <span>"Open payout for Juma Omondi"</span>
          </button>

          <button
            onClick={() => handleSimulateDictation('chat', 'Disburse payout to Wanjiku Mwangi')}
            className="bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-white px-2.5 py-1 rounded-lg text-[11px] font-mono transition flex items-center gap-1 border border-slate-700"
          >
            <Mic className="w-3 h-3 text-emerald-400" />
            <span>"Payout to Wanjiku"</span>
          </button>

          <button
            onClick={() => handleSimulateDictation('chat', 'Create work order for vehicle KMG 482E')}
            className="bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white px-2.5 py-1 rounded-lg text-[11px] font-mono transition flex items-center gap-1 border border-slate-700"
          >
            <Mic className="w-3 h-3 text-amber-400" />
            <span>"Work Order for KMG 482E"</span>
          </button>

          <button
            onClick={() => handleSimulateDictation('chat', 'Record fuel refill for KCY 882P')}
            className="bg-slate-800 hover:bg-slate-700 text-blue-300 hover:text-white px-2.5 py-1 rounded-lg text-[11px] font-mono transition flex items-center gap-1 border border-slate-700"
          >
            <Mic className="w-3 h-3 text-blue-400" />
            <span>"Record Fuel for KCY 882P"</span>
          </button>

          <button
            onClick={() => handleSimulateDictation('chat', 'Record EV battery charging for KDH 109G')}
            className="bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-white px-2.5 py-1 rounded-lg text-[11px] font-mono transition flex items-center gap-1 border border-slate-700"
          >
            <Mic className="w-3 h-3 text-purple-400" />
            <span>"Record EV Charging for KDH 109G"</span>
          </button>

          <button
            onClick={() => handleSimulateDictation('chat', 'Send dispatch alert message to Hassan Ali')}
            className="bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white px-2.5 py-1 rounded-lg text-[11px] font-mono transition flex items-center gap-1 border border-slate-700"
          >
            <Mic className="w-3 h-3 text-indigo-400" />
            <span>"Message Hassan Ali"</span>
          </button>
        </div>
      </div>

      {/* RECOGNIZED VOICE COMMAND AUTO-FILL BANNER */}
      {recognizedVoiceAction && (
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 border-2 border-emerald-500/80 rounded-2xl p-4 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-lg shadow-emerald-500/30 mt-0.5">
              <Sparkles className="w-6 h-6 fill-current" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/40 uppercase">
                  Voice Command Auto-Filled ({recognizedVoiceAction.timestamp})
                </span>
                {recognizedVoiceAction.command.driver && (
                  <span className="bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/40 flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-indigo-400" />
                    Driver: {recognizedVoiceAction.command.driver.fullName}
                  </span>
                )}
                {recognizedVoiceAction.command.vehicle && (
                  <span className="bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/40 flex items-center gap-1">
                    <Bike className="w-3 h-3 text-amber-400" />
                    Vehicle: {recognizedVoiceAction.command.vehicle.registrationNumber}
                  </span>
                )}
              </div>
              <h4 className="font-bold text-sm text-white mt-1.5 flex items-center gap-2">
                {recognizedVoiceAction.command.displayText}
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                {recognizedVoiceAction.command.actionSummary}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            <button
              onClick={() => {
                const cmd = recognizedVoiceAction.command;
                if (cmd.intent === 'payout') onOpenMpesaPayoutModal?.(cmd.driver);
                else if (cmd.intent === 'workOrder') onOpenWorkOrderModal?.(cmd.vehicle);
                else if (cmd.intent === 'fuel') onOpenRecordFuelModal?.(cmd.vehicle, cmd.driver);
                else if (cmd.intent === 'ev') onOpenRecordEvModal?.(cmd.vehicle);
                else if (cmd.intent === 'message') onOpenMessageComposer?.(cmd.driver);
                else if (cmd.intent === 'newVehicle') onOpenNewVehicleModal?.();
              }}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-3.5 py-2 rounded-xl text-xs transition shadow-lg flex items-center gap-1.5 cursor-pointer"
            >
              <span>Re-open Pre-filled Modal</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setRecognizedVoiceAction(null)}
              className="text-slate-400 hover:text-white text-xs px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* MODE 1: AGENT CHATBOT + FUNCTION CALLING */}
      {activeMode === 'chat' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {suggestedChatPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSendChat(p)}
                className="bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 transition shadow-2xs flex items-center gap-1.5"
              >
                <Zap className="w-3 h-3 text-emerald-600 fill-current" />
                <span>{p}</span>
              </button>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs min-h-[420px] max-h-[500px] overflow-y-auto space-y-4">
            {chatMessages.map((m, idx) => (
              <div key={idx} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed shadow-2xs space-y-2 ${
                  m.sender === 'user' ? 'bg-emerald-600 text-white font-medium' : 'bg-slate-50 border border-slate-200 text-slate-800'
                }`}>
                  {m.model && <div className="text-[9px] font-bold text-emerald-700 uppercase font-mono">[{m.model}]</div>}
                  <div className="whitespace-pre-wrap">{m.text}</div>

                  {/* Executed DB Actions Badges */}
                  {m.executedActions && m.executedActions.length > 0 && (
                    <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                      <div className="text-[10px] font-bold text-emerald-800 uppercase flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Automated Fleet Database Actions Executed:</span>
                      </div>
                      {m.executedActions.map((act, i) => (
                        <div key={i} className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-2 rounded-lg text-[11px] font-mono flex items-start gap-1.5">
                          <Wrench className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">{act.action}:</span> {act.result || act.error}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1 font-mono">{m.time}</span>
              </div>
            ))}

            {chatLoading && (
              <div className="flex items-center gap-2 text-emerald-700 text-xs font-semibold bg-emerald-50 p-3 rounded-xl border border-emerald-200 w-fit">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                <span>GreenShift AI Agent reasoning & evaluating tool calls...</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Ask or command GreenShift AI (or click mic icon to dictate)..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                className="w-full bg-white border border-slate-200 rounded-xl pl-4 pr-10 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 shadow-xs"
              />
              <button
                onClick={() => isListening && listeningTarget === 'chat' ? stopListening() : startListening('chat')}
                title="Dictate with Microphone"
                className={`absolute right-2 top-2 p-1.5 rounded-lg transition ${
                  isListening && listeningTarget === 'chat'
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-100'
                }`}
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => handleSendChat()}
              disabled={chatLoading || !chatInput.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl text-xs transition shadow-xs flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </div>
        </div>
      )}

      {/* MODE 2: TTS VOICE DISPATCH */}
      {activeMode === 'speech' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-indigo-600" />
                Gemini Voice Dispatcher (Text-to-Speech)
              </h3>
              <p className="text-xs text-slate-500">Converts dispatch alerts into spoken audio instructions using model <span className="font-mono text-indigo-600 font-bold">gemini-3.1-flash-tts-preview</span></p>
            </div>
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-800 text-[10px] font-bold rounded-lg border border-indigo-200">
              Model: gemini-3.1-flash-tts-preview
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Dispatch Announcement Message:</label>
                <button
                  onClick={() => isListening && listeningTarget === 'speech' ? stopListening() : startListening('speech')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                    isListening && listeningTarget === 'speech'
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>{isListening && listeningTarget === 'speech' ? 'Listening...' : 'Dictate Alert'}</span>
                </button>
              </div>
              <textarea
                rows={3}
                value={speechPrompt}
                onChange={(e) => setSpeechPrompt(e.target.value)}
                placeholder="Enter alert message to speak or dictate using mic..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Select Voice Model:</label>
              <select
                value={speechVoice}
                onChange={(e) => setSpeechVoice(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
              >
                <option value="Zephyr">Zephyr (Balanced Announcer)</option>
                <option value="Kore">Kore (Clear Professional Female)</option>
                <option value="Puck">Puck (Energetic Expressive)</option>
                <option value="Fenrir">Fenrir (Authoritative Deep Male)</option>
              </select>

              <button
                onClick={handleGenerateSpeech}
                disabled={speechLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-xs transition flex items-center justify-center gap-2 mt-2 shadow-xs"
              >
                {speechLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                <span>Synthesize Speech</span>
              </button>
            </div>
          </div>

          {speechAudioBase64 && (
            <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => playAudioFromBase64(speechAudioBase64, speechMimeType)}
                  className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs hover:bg-indigo-700 transition"
                >
                  {isPlayingAudio ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>
                <div>
                  <div className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Speech Audio Ready ({speechVoice} Voice)
                  </div>
                  <div className="text-[11px] text-indigo-700 line-clamp-1 mt-0.5">"{speechPrompt}"</div>
                </div>
              </div>

              <a
                href={`data:${speechMimeType};base64,${speechAudioBase64}`}
                download={`greenshift-speech-dispatch-${Date.now()}.mp3`}
                className="bg-white hover:bg-indigo-100 text-indigo-800 border border-indigo-200 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Audio</span>
              </a>
            </div>
          )}
        </div>
      )}

      {/* MODE 3: VISUAL DEFECT & RECEIPT INSPECTION */}
      {activeMode === 'vision' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-600" />
                Visual Defect & Receipt Vision Inspector
              </h3>
              <p className="text-xs text-slate-500">Automated AI damage assessment and document verification using model <span className="font-mono text-amber-600 font-bold">gemini-3.6-flash</span></p>
            </div>
            <span className="px-2.5 py-1 bg-amber-50 text-amber-800 text-[10px] font-bold rounded-lg border border-amber-200">
              Model: gemini-3.6-flash
            </span>
          </div>

          {/* Preset Sample Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">Select Preset Fleet Component Photo or Upload Custom File:</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                onClick={() => handleSelectPresetImage('battery')}
                className={`p-2.5 rounded-xl border text-xs font-semibold transition flex flex-col items-center gap-1 ${
                  selectedPresetImage === 'battery' ? 'bg-amber-50 border-amber-500 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <Zap className="w-4 h-4 text-amber-600" />
                <span>EV Battery</span>
              </button>

              <button
                onClick={() => handleSelectPresetImage('tire')}
                className={`p-2.5 rounded-xl border text-xs font-semibold transition flex flex-col items-center gap-1 ${
                  selectedPresetImage === 'tire' ? 'bg-amber-50 border-amber-500 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <Wrench className="w-4 h-4 text-slate-600" />
                <span>Tire Tread</span>
              </button>

              <button
                onClick={() => handleSelectPresetImage('receipt')}
                className={`p-2.5 rounded-xl border text-xs font-semibold transition flex flex-col items-center gap-1 ${
                  selectedPresetImage === 'receipt' ? 'bg-amber-50 border-amber-500 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>M-Pesa Receipt</span>
              </button>

              <button
                onClick={() => handleSelectPresetImage('dent')}
                className={`p-2.5 rounded-xl border text-xs font-semibold transition flex flex-col items-center gap-1 ${
                  selectedPresetImage === 'dent' ? 'bg-amber-50 border-amber-500 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Bumper Damage</span>
              </button>

              <label className="p-2.5 rounded-xl border border-dashed border-slate-300 text-xs font-semibold hover:border-amber-500 text-slate-600 flex flex-col items-center justify-center gap-1 cursor-pointer transition">
                <Upload className="w-4 h-4 text-slate-500" />
                <span>Upload Custom</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            {/* Image Preview Box */}
            <div className="bg-slate-900 rounded-xl p-3 flex flex-col items-center justify-center border border-slate-800 h-full min-h-[180px]">
              {visionImageBase64 ? (
                <img
                  src={`data:image/jpeg;base64,${visionImageBase64}`}
                  alt="Component Preview"
                  className="max-h-40 w-auto object-contain rounded-lg shadow-sm"
                />
              ) : (
                <div className="text-slate-400 text-xs">No image selected</div>
              )}
              <span className="text-[10px] text-slate-400 mt-2 font-mono">Image size: 320x240 JPEG</span>
            </div>

            {/* Prompt & Action */}
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Diagnostic Inspection Prompt:</label>
                <button
                  onClick={() => isListening && listeningTarget === 'vision' ? stopListening() : startListening('vision')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                    isListening && listeningTarget === 'vision'
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>{isListening && listeningTarget === 'vision' ? 'Listening...' : 'Dictate Prompt'}</span>
                </button>
              </div>
              <textarea
                rows={3}
                value={visionPrompt}
                onChange={(e) => setVisionPrompt(e.target.value)}
                placeholder="Describe what to inspect or dictate..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-amber-600"
              />

              <button
                onClick={handleRunVisionInspection}
                disabled={visionLoading || !visionImageBase64}
                className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl text-xs transition flex items-center gap-2 shadow-xs"
              >
                {visionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                <span>Run Vision Inspection</span>
              </button>
            </div>
          </div>

          {visionResult && (
            <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Gemini Vision Diagnostic Report:
                </div>
              </div>
              <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans bg-white p-4 rounded-lg border border-amber-100 shadow-2xs">
                {visionResult}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 4: SEARCH GROUNDING */}
      {activeMode === 'search' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600" />
                Google Search Grounding (EPRA & Market Intelligence)
              </h3>
              <p className="text-xs text-slate-500">Retrieves real-time live web data using model <span className="font-mono text-blue-600 font-bold">gemini-3.6-flash</span> with <span className="font-mono text-blue-600 font-bold">googleSearch</span> tool</p>
            </div>
            <span className="px-2.5 py-1 bg-blue-50 text-blue-800 text-[10px] font-bold rounded-lg border border-blue-200">
              Tool: googleSearch
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">Search Grounding Query:</label>
              <button
                onClick={() => isListening && listeningTarget === 'search' ? stopListening() : startListening('search')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                  isListening && listeningTarget === 'search'
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>{isListening && listeningTarget === 'search' ? 'Listening...' : 'Dictate Query'}</span>
              </button>
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={searchPrompt}
                onChange={(e) => setSearchPrompt(e.target.value)}
                placeholder="Enter query or dictate..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
              />
              <button
                onClick={handleRunSearchGrounding}
                disabled={searchLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition flex items-center gap-2"
              >
                {searchLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>Fetch Search Data</span>
              </button>
            </div>
          </div>

          {searchResult && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Search Grounding Output:
              </div>
              <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">
                {searchResult}
              </div>
              {searchChunks.length > 0 && (
                <div className="pt-3 border-t border-slate-200 text-[11px] text-slate-500 space-y-1">
                  <div className="font-bold text-slate-700">Grounding Sources:</div>
                  {searchChunks.map((c, i) => (
                    <div key={i} className="text-blue-600 underline truncate">{c.web?.uri || c.web?.title || 'Source'}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODE 5: MAPS GROUNDING */}
      {activeMode === 'maps' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-600" />
                Google Maps Grounding (Swapping Hubs & Logistics Corridors)
              </h3>
              <p className="text-xs text-slate-500">Locates spatial coordinates, EV battery swap hubs, and road infrastructure using model <span className="font-mono text-rose-600 font-bold">gemini-3.6-flash</span> with <span className="font-mono text-rose-600 font-bold">googleMaps</span> tool</p>
            </div>
            <span className="px-2.5 py-1 bg-rose-50 text-rose-800 text-[10px] font-bold rounded-lg border border-rose-200">
              Tool: googleMaps
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">Maps Grounding Location Query:</label>
              <button
                onClick={() => isListening && listeningTarget === 'maps' ? stopListening() : startListening('maps')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                  isListening && listeningTarget === 'maps'
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>{isListening && listeningTarget === 'maps' ? 'Listening...' : 'Dictate Station'}</span>
              </button>
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={mapsPrompt}
                onChange={(e) => setMapsPrompt(e.target.value)}
                placeholder="Query battery swapping hubs or dictate..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-rose-600"
              />
              <button
                onClick={handleRunMapsGrounding}
                disabled={mapsLoading}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition flex items-center gap-2"
              >
                {mapsLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                <span>Fetch Location Grounding</span>
              </button>
            </div>
          </div>

          {mapsResult && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Maps Grounding Location Intelligence:
              </div>
              <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">
                {mapsResult}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 6: LOW-LATENCY RESPONSES */}
      {activeMode === 'fast' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-amber-500" />
                Low-Latency Fast Dispatcher Response
              </h3>
              <p className="text-xs text-slate-500">Ultra-fast sub-second response generation using model <span className="font-mono text-amber-600 font-bold">gemini-3.1-flash-lite</span></p>
            </div>
            <span className="px-2.5 py-1 bg-amber-50 text-amber-800 text-[10px] font-bold rounded-lg border border-amber-200">
              Model: gemini-3.1-flash-lite
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">Instant Dispatcher Instruction Prompt:</label>
              <button
                onClick={() => isListening && listeningTarget === 'fast' ? stopListening() : startListening('fast')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                  isListening && listeningTarget === 'fast'
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>{isListening && listeningTarget === 'fast' ? 'Listening...' : 'Dictate Prompt'}</span>
              </button>
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={fastPrompt}
                onChange={(e) => setFastPrompt(e.target.value)}
                placeholder="Fast dispatch generation prompt or dictate..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={handleRunFastReply}
                disabled={fastLoading}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition flex items-center gap-2"
              >
                {fastLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                <span>Generate Instant Alert</span>
              </button>
            </div>
          </div>

          {fastResult && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Low-Latency Generated Output:
              </div>
              <div className="text-xs text-slate-800 font-mono bg-amber-50/50 p-3 rounded-lg border border-amber-200">
                "{fastResult}"
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 7: HIGH THINKING MODE */}
      {activeMode === 'thinking' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-600" />
                Deep Strategic Fleet Thinking Mode
              </h3>
              <p className="text-xs text-slate-500">Complex reasoning, fuel fraud detection, and EV migration ROI using model <span className="font-mono text-purple-600 font-bold">gemini-3.6-flash</span> with <span className="font-mono text-purple-600 font-bold">thinkingConfig (Level: HIGH)</span></p>
            </div>
            <span className="px-2.5 py-1 bg-purple-50 text-purple-800 text-[10px] font-bold rounded-lg border border-purple-200">
              Model: gemini-3.6-flash + Thinking
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">Deep Analysis Audit Prompt:</label>
              <button
                onClick={() => isListening && listeningTarget === 'thinking' ? stopListening() : startListening('thinking')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                  isListening && listeningTarget === 'thinking'
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>{isListening && listeningTarget === 'thinking' ? 'Listening...' : 'Dictate Audit Parameters'}</span>
              </button>
            </div>
            <div className="flex gap-3">
              <textarea
                rows={3}
                value={thinkingPrompt}
                onChange={(e) => setThinkingPrompt(e.target.value)}
                placeholder="Enter complex fleet audit parameters or dictate..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-purple-600"
              />
              <button
                onClick={handleRunThinking}
                disabled={thinkingLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded-xl text-xs transition flex items-center gap-2 self-end"
              >
                {thinkingLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                <span>Run Thinking Audit</span>
              </button>
            </div>
          </div>

          {thinkingResult && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Deep Thinking Reasoning Report:
              </div>
              <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">
                {thinkingResult}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
