/**
 * useVoiceCall — WebRTC voice call via Firebase Realtime Database signaling.
 *
 * Data model in Firebase:
 *   voice-call/
 *     participants/{uid}: { joinedAt: number }
 *     signals/{uidA}_{uidB}/           (uidA < uidB lexicographically)
 *       offer:             { type, sdp }
 *       answer:            { type, sdp }
 *       offerCandidates/   { [key]: RTCIceCandidateInit }
 *       answerCandidates/  { [key]: RTCIceCandidateInit }
 *
 * The party whose UID is alphabetically smaller is always the offerer.
 * This ensures both sides deterministically agree on roles without negotiation.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import {
  ref,
  set,
  onValue,
  push,
  remove,
} from "firebase/database";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

interface PeerState {
  pc: RTCPeerConnection;
  /** Candidates queued before remote description is set */
  pendingCandidates: RTCIceCandidateInit[];
  remoteDescSet: boolean;
  /** Firebase listener unsubscribers for this pair */
  processedCandKeys: Set<string>;
  cleanupFns: (() => void)[];
}

function pairId(a: string, b: string): string {
  return a < b ? `${a}__${b}` : `${b}__${a}`;
}

export function useVoiceCall() {
  const { user } = useAuth();
  const myUid = user?.uid ?? null;

  const [isMuted, setIsMuted] = useState(true);       // true = not in call / muted
  const [callParticipantCount, setCallParticipantCount] = useState(0);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Record<string, PeerState>>({});
  const audioElsRef = useRef<Record<string, HTMLAudioElement>>({});
  const inCallRef = useRef(false);

  // ── Helpers ──────────────────────────────────────────────────────

  const drainPending = useCallback(
    async (state: PeerState) => {
      for (const c of state.pendingCandidates) {
        await state.pc
          .addIceCandidate(new RTCIceCandidate(c))
          .catch(() => {});
      }
      state.pendingCandidates = [];
    },
    []
  );

  const handleIncomingCandidate = useCallback(
    (state: PeerState, key: string, cand: RTCIceCandidateInit) => {
      if (state.processedCandKeys.has(key)) return;
      state.processedCandKeys.add(key);
      if (state.remoteDescSet) {
        state.pc
          .addIceCandidate(new RTCIceCandidate(cand))
          .catch(() => {});
      } else {
        state.pendingCandidates.push(cand);
      }
    },
    []
  );

  // ── Connect to a single remote peer ──────────────────────────────

  const connectToPeer = useCallback(
    async (remoteUid: string) => {
      if (!myUid || peersRef.current[remoteUid]) return;

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      const state: PeerState = {
        pc,
        pendingCandidates: [],
        remoteDescSet: false,
        processedCandKeys: new Set(),
        cleanupFns: [],
      };
      peersRef.current[remoteUid] = state;

      // Add local audio tracks to this connection
      if (localStreamRef.current) {
        for (const track of localStreamRef.current.getTracks()) {
          pc.addTrack(track, localStreamRef.current);
        }
      }

      // Play remote audio
      pc.ontrack = (e) => {
        let audio = audioElsRef.current[remoteUid];
        if (!audio) {
          audio = new Audio();
          audio.autoplay = true;
          audioElsRef.current[remoteUid] = audio;
        }
        if (audio.srcObject !== e.streams[0]) {
          audio.srcObject = e.streams[0];
        }
      };

      const pid = pairId(myUid, remoteUid);
      const imOfferer = myUid < remoteUid;

      const myCandPath = `voice-call/signals/${pid}/${
        imOfferer ? "offerCandidates" : "answerCandidates"
      }`;
      const theirCandPath = `voice-call/signals/${pid}/${
        imOfferer ? "answerCandidates" : "offerCandidates"
      }`;

      // Ship my ICE candidates to Firebase
      pc.onicecandidate = (e) => {
        if (!e.candidate) return;
        push(ref(db, myCandPath), e.candidate.toJSON()).catch(() => {});
      };

      if (imOfferer) {
        // --- I am the offerer ---
        // Clear any stale signals from a previous call so the answerer
        // doesn't process an old offer/answer and break the handshake.
        await remove(ref(db, `voice-call/signals/${pid}`)).catch(() => {});

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await set(ref(db, `voice-call/signals/${pid}/offer`), {
          type: offer.type,
          sdp: offer.sdp,
        });

        // Listen for answer
        const answerRef = ref(db, `voice-call/signals/${pid}/answer`);
        const unsubAnswer = onValue(answerRef, async (snap) => {
          if (!snap.exists() || state.remoteDescSet) return;
          state.remoteDescSet = true;
          await pc
            .setRemoteDescription(new RTCSessionDescription(snap.val()))
            .catch(() => {});
          await drainPending(state);
        });
        state.cleanupFns.push(unsubAnswer);

        // Listen for their candidates
        const theirRef = ref(db, theirCandPath);
        const unsubCands = onValue(theirRef, (snap) => {
          if (!snap.exists()) return;
          snap.forEach((child) =>
            handleIncomingCandidate(state, child.key!, child.val())
          );
        });
        state.cleanupFns.push(unsubCands);
      } else {
        // --- I am the answerer ---
        const offerRef = ref(db, `voice-call/signals/${pid}/offer`);
        const unsubOffer = onValue(offerRef, async (snap) => {
          if (!snap.exists() || state.remoteDescSet) return;
          state.remoteDescSet = true;
          await pc
            .setRemoteDescription(new RTCSessionDescription(snap.val()))
            .catch(() => {});
          await drainPending(state);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await set(ref(db, `voice-call/signals/${pid}/answer`), {
            type: answer.type,
            sdp: answer.sdp,
          });
        });
        state.cleanupFns.push(unsubOffer);

        // Listen for their candidates
        const theirRef = ref(db, theirCandPath);
        const unsubCands = onValue(theirRef, (snap) => {
          if (!snap.exists()) return;
          snap.forEach((child) =>
            handleIncomingCandidate(state, child.key!, child.val())
          );
        });
        state.cleanupFns.push(unsubCands);
      }
    },
    [myUid, drainPending, handleIncomingCandidate]
  );

  // ── Disconnect from peer ──────────────────────────────────────────

  const disconnectFromPeer = useCallback((remoteUid: string) => {
    const state = peersRef.current[remoteUid];
    if (!state) return;
    state.cleanupFns.forEach((fn) => fn());
    state.pc.close();
    delete peersRef.current[remoteUid];

    const audio = audioElsRef.current[remoteUid];
    if (audio) {
      audio.srcObject = null;
      audio.pause();
      delete audioElsRef.current[remoteUid];
    }
  }, []);

  // ── Join / leave call ─────────────────────────────────────────────

  const leaveCall = useCallback(async () => {
    if (!myUid || !inCallRef.current) return;
    inCallRef.current = false;
    setIsMuted(true);

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    // Clean up signal data in Firebase so stale offers/answers don't
    // interfere with the next call session.
    for (const uid of Object.keys(peersRef.current)) {
      const pid = pairId(myUid, uid);
      remove(ref(db, `voice-call/signals/${pid}`)).catch(() => {});
      disconnectFromPeer(uid);
    }

    await remove(ref(db, `voice-call/participants/${myUid}`)).catch(() => {});
  }, [myUid, disconnectFromPeer]);

  const joinCall = useCallback(async () => {
    if (!myUid || inCallRef.current) return;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
    } catch {
      console.error("[useVoiceCall] Microphone access denied");
      return;
    }

    localStreamRef.current = stream;
    inCallRef.current = true;
    setIsMuted(false);

    // Register in Firebase
    await set(ref(db, `voice-call/participants/${myUid}`), {
      joinedAt: Date.now(),
    }).catch(() => {});

    // One-shot read of who is already in the call
    const participantsRef = ref(db, "voice-call/participants");
    onValue(
      participantsRef,
      async (snap) => {
        const participants = snap.val() ? Object.keys(snap.val()) : [];
        for (const uid of participants) {
          if (uid !== myUid && !peersRef.current[uid]) {
            await connectToPeer(uid);
          }
        }
      },
      { onlyOnce: true }
    );
  }, [myUid, connectToPeer]);

  const toggleMic = useCallback(() => {
    if (inCallRef.current) {
      leaveCall();
    } else {
      joinCall();
    }
  }, [joinCall, leaveCall]);

  // ── Watch call participants ────────────────────────────────────────
  // When new participants join while I'm in call → connect to them.
  // When participants leave → disconnect from them.
  useEffect(() => {
    if (!myUid) return;
    const participantsRef = ref(db, "voice-call/participants");
    const unsub = onValue(participantsRef, async (snap) => {
      const active = snap.val() ? (Object.keys(snap.val()) as string[]) : [];
      setCallParticipantCount(active.length);

      if (!inCallRef.current) return;

      // Connect to newcomers
      for (const uid of active) {
        if (uid !== myUid && !peersRef.current[uid]) {
          await connectToPeer(uid);
        }
      }
      // Disconnect from departed
      for (const uid of Object.keys(peersRef.current)) {
        if (!active.includes(uid)) {
          disconnectFromPeer(uid);
        }
      }
    });
    return () => {
      unsub();
    };
  }, [myUid, connectToPeer, disconnectFromPeer]);

  // ── Cleanup on unmount ────────────────────────────────────────────
  const leaveCallRef = useRef(leaveCall);
  leaveCallRef.current = leaveCall;
  useEffect(() => {
    return () => {
      leaveCallRef.current();
    };
  }, []);

  return { isMuted, callParticipantCount, toggleMic };
}
