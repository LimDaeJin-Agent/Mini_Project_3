"use client";

import { VoiceProvider } from "@/lib/VoiceContext";
import VoiceAssistant from "@/components/VoiceAssistant";

export default function Providers({ children }) {
  return (
    <VoiceProvider>
      <VoiceAssistant />
      {children}
    </VoiceProvider>
  );
}
