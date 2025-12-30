'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ConnectionState,
  LocalParticipant,
  Participant,
  RemoteParticipant,
  Track,
} from 'livekit-client';
// Assuming standard UI button or I can use the custom one if it fits
import { Loader2, MessageCircle, Mic, X } from 'lucide-react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useLocalParticipant,
  useTracks,
} from '@livekit/components-react';
import { Button } from '@/components/livekit/button';
import { cn } from '@/lib/utils';
import { GlowingRingVisualizer } from './glowing-ring-visualizer';

export function HomepageVoiceAgent() {
  const [connectionDetails, setConnectionDetails] = useState<{
    serverUrl: string;
    roomName: string;
    participantToken: string;
    participantName: string;
  } | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const response = await fetch('/api/connection-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        throw new Error('Failed to load connection details');
      }
      const data = await response.json();
      setConnectionDetails(data);
    } catch (e) {
      console.error(e);
      setError('Failed to connect. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setConnectionDetails(null);
  }, []);

  if (connectionDetails) {
    return (
      <LiveKitRoom
        token={connectionDetails.participantToken}
        serverUrl={connectionDetails.serverUrl}
        connect={true}
        audio={true}
        video={false}
        onDisconnected={disconnect}
        className="relative flex h-[400px] w-full max-w-md flex-col items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-black/40 shadow-2xl backdrop-blur-xl"
      >
        <RoomAudioRenderer />
        <AgentVisualizer onDisconnect={disconnect} />
      </LiveKitRoom>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <Button
        onClick={connect}
        disabled={isConnecting}
        className="group text-brand-signature relative inline-flex h-12 items-center gap-3 overflow-hidden rounded-full bg-white px-8 text-base font-medium shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all hover:scale-105 hover:bg-white/90 disabled:opacity-70"
      >
        {isConnecting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MessageCircle className="h-4 w-4 transition-transform group-hover:rotate-12" />
        )}
        <span>{isConnecting ? 'A Ligação...' : 'Começar Conversa'}</span>
      </Button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

function AgentVisualizer({ onDisconnect }: { onDisconnect: () => void }) {
  const connectionState = useConnectionState();
  // We want to visualize the AGENT's audio, which is a Remote Audio Track.
  // Actually usually we might want to visualize the mixed audio or just the agent.
  // Let's filter for remote tracks first.

  const remoteTracks = useTracks([Track.Source.Microphone]).filter(
    (t) => t.participant instanceof RemoteParticipant
  );

  // Ideally we visualize the dominant speaker or just the agent.
  // For a 1-on-1 agent scenario, the remote track is the agent.

  const agentTrackRef = remoteTracks[0];
  // If agent is not speaking, we might want to show user mic?
  // The "Glowing Ai Voice Spectrum" usually reacts to the AI voice.
  // Let's stick to Agent Voice for the main visualizer, maybe a smaller one for user?
  // Or simpler: Just visualize whichever audio is playing?
  // Let's visualize the REMOTE track (Agent).

  const [stream, setStream] = useState<MediaStream | undefined>(undefined);

  useEffect(() => {
    if (agentTrackRef?.publication?.track?.mediaStream) {
      setStream(agentTrackRef.publication.track.mediaStream);
    }
  }, [agentTrackRef]);

  // Fallback: If no agent track yet (connecting), we can show a placeholder or user mic?
  // Let's allow visualizing local mic if agent is silent/not valid?
  // But usually the user wants to see the AI thinking/speaking.

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center p-8">
      {/* Connection Status Label */}
      <div className="text-brand-lilac absolute top-6 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium tracking-wider uppercase backdrop-blur-md">
        {connectionState === ConnectionState.Connected ? 'Em chamada' : 'A conectar...'}
      </div>

      <div className="relative flex w-full flex-1 items-center justify-center">
        {connectionState === ConnectionState.Connected ? (
          <GlowingRingVisualizer stream={stream} height="300px" width="300px" />
        ) : (
          <div className="bg-brand-signature/20 h-32 w-32 animate-pulse rounded-full blur-xl" />
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-6 flex items-center gap-4">
        <Button
          variant="destructive"
          size="icon"
          className="h-12 w-12 rounded-full border border-red-500/50 bg-red-500/20 text-red-400 backdrop-blur-md hover:bg-red-500/30"
          onClick={onDisconnect}
        >
          <X className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
