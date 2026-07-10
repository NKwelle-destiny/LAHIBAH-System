'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

//  FIXED: Restored the Message type interface
interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  createdAt: Date;
}

//  FIXED: Restored the ChatRoomWindowProps interface
interface ChatRoomWindowProps {
  roomId: string;
  initialMessages: Message[];
  currentUser: { id: string; name: string };
}

export default function ChatRoomWindow({ roomId, initialMessages, currentUser }: ChatRoomWindowProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [textInput, setTextInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Auto-scrolling feature for incoming traffic
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle standard text message delivery
const handleSend = async () => {
  const response = await fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, content: textInput })
  });

  //  SAFEGUARD: Intercept HTML error boundaries before parsing bytes
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Server returned status ${response.status}. Raw body:`, errorText);
    alert(`Server Error (${response.status}): Failed to send message.`);
    return;
  }

  // Safe to parse once validated
  const data = await response.json();
  return data;
};


  // Choose and send picture files
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localImageUrl = URL.createObjectURL(file);

    const mediaMessage: Message = {
      id: Math.random().toString(),
      content: `<img src="${localImageUrl}" class="rounded-lg max-w-full h-auto mt-1" alt="Sent image" />`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      createdAt: new Date()
    };

    setMessages((prev) => [...prev, mediaMessage]);
  };

  // Handle audio microphone stream activation
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);

        const voiceMessage: Message = {
          id: Math.random().toString(),
          content: `<audio controls src="${audioUrl}" class="max-w-full mt-1"></audio>`,
          senderId: currentUser.id,
          senderName: currentUser.name,
          createdAt: new Date()
        };

        setMessages((prev) => [...prev, voiceMessage]);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("Microphone access denied or unsupported.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0b141a] rounded-none shadow-md overflow-hidden">
      
      {/* CHAT WINDOW HEADER */}
      <header className="h-16 min-h-[64px] bg-[#202c33] flex items-center px-4 justify-between border-b border-[#222e35]">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => router.push('/messages')}
            className="block md:hidden p-1.5 rounded-full text-[#8696a0] hover:bg-[#2a3942] hover:text-[#e9edef] transition-colors shrink-0"
            title="Back to conversation list"
          >
            <svg xmlns="http://w3.org" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>

          <div className="w-10 h-10 rounded-full bg-zinc-700 shrink-0" />
          <div>
            <h3 className="text-sm font-medium tracking-wide capitalize text-[#e9edef]">
              {roomId?.replace('-', ' ')}
            </h3>
            <p className="text-[11px] text-[#8696a0]">online</p>
          </div>
        </div>
      </header>

      {/* MESSAGES FEED SCROLL CONTAINER */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {messages.map((msg) => {
          const isSenderMe = msg.senderId === currentUser.id;
          return (
            <div key={msg.id} className={`flex ${isSenderMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] sm:max-w-[65%] rounded-lg px-3 py-1.5 text-sm shadow-sm relative ${
                isSenderMe 
                  ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none' 
                  : 'bg-[#202c33] text-[#e9edef] rounded-tl-none'
              }`}>
                {!isSenderMe && <p className="text-[11px] text-emerald-400 font-medium mb-0.5">{msg.senderName}</p>}
                
                {msg.content.startsWith('<') ? (
                  <div dangerouslySetInnerHTML={{ __html: msg.content }} />
                ) : (
                  //  FIXED: Updated class to wrap-break-word per lint warnings
                  <p className="wrap-break-word leading-relaxed">{msg.content}</p>
                )}
                
                <span className="text-[9px] block text-right text-[#8696a0] mt-1 select-none">
                  12:00 PM
                </span>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* BOTTOM CONTROL PANEL INPUT */}
      <form onSubmit={handleSend} className="h-16 min-h-[64px] bg-[#202c33] px-3 flex items-center gap-2 pb-safe">
        
        {/* Media Camera Picker */}
        <label className="p-2 text-[#8696a0] hover:text-[#e9edef] cursor-pointer transition-colors shrink-0">
          <svg xmlns="http://w3.org" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
          </svg>
          <input 
            type="file" 
            accept="image/*" 
            capture="user" 
            onChange={handleImageUpload} 
            className="hidden" 
          />
        </label>

        <input 
          type="text" 
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          disabled={isRecording}
          placeholder={isRecording ? "Recording voice note..." : "Type a message"} 
          className="flex-1 bg-[#2a3942] rounded-lg text-base md:text-sm px-4 py-2.5 text-[#e9edef] placeholder-[#8696a0] focus:outline-none disabled:opacity-50"
        />

        {textInput.trim() === '' ? (
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-2 rounded-full transition-all shrink-0 ${
              isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-[#8696a0] hover:text-[#e9edef]'
            }`}
          >
            {isRecording ? (
              <svg xmlns="http://w3.org" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z" clipRule="evenodd" /></svg>
            ) : (
              <svg xmlns="http://w3.org" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" /></svg>
            )}
          </button>
        ) : (
          <button type="submit" className="text-emerald-500 hover:text-emerald-400 p-2 shrink-0">
            <svg className="w-6 h-6 rotate-90" fill="currentColor" viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
          </button>
        )}
      </form>
    </div>
  );
}
