"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, Send, MessageCircle } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import clsx from "clsx";
import { getAvatarUrl, getUserInitials } from "@/lib/avatar";

type ChatMessage = {
    id: string;
    user_id: string;
    message: string;
    message_type: "text" | "place_notification" | "pin_notification";
    place_id?: string;
    pin_id?: string;
    created_at: string;
    users?: {
        username: string;
        avatar_url?: string;
    };
    place?: {
        id: string;
        name: string;
        image_url: string;
    };
    pins?: {
        id: string;
        title: string;
        description?: string;
        latitude: number;
        longitude: number;
        image_url?: string;
        camera_image_url?: string;
        radius: number;
        places?: {
            id: string;
            name: string;
            image_url: string;
        };
    };
};

type Vote = {
    id: string;
    user_id: string;
    message_id: string;
    radius_range: string;
    created_at: string;
    users?: {
        username: string;
    };
};

type RadiusVote = {
    range: string;
    count: number;
    userVoted: boolean;
};

type ChatProps = {
    isOpen: boolean;
    onClose: () => void;
    onUnreadCountChange?: (count: number) => void;
};

const RADIUS_RANGES = [
    "0-100",
    "100-300",
    "300-500",
    "500-1000",
    "1000-2000",
    "2000-5000",
];

export default function Chat({ isOpen, onClose, onUnreadCountChange }: ChatProps) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [votes, setVotes] = useState<Vote[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const channelsRef = useRef<any[]>([]);
    const previousMessagesCountRef = useRef<number>(0);
    const audioContextRef = useRef<AudioContext | null>(null);

    // Create iOS-like notification sound
    const playMessageSound = useCallback(() => {
        if (typeof window === 'undefined') return;
        
        try {
            // Create AudioContext if not exists
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            
            const audioContext = audioContextRef.current;
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            // iOS Message sound characteristics (two-tone chime)
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // First tone - higher pitch
            oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
            oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
            
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
            
            // Second tone - slightly lower pitch (after a short pause)
            setTimeout(() => {
                const oscillator2 = audioContext.createOscillator();
                const gainNode2 = audioContext.createGain();
                
                oscillator2.connect(gainNode2);
                gainNode2.connect(audioContext.destination);
                
                oscillator2.frequency.setValueAtTime(392.00, audioContext.currentTime); // G4
                
                gainNode2.gain.setValueAtTime(0, audioContext.currentTime);
                gainNode2.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
                gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
                
                oscillator2.start(audioContext.currentTime);
                oscillator2.stop(audioContext.currentTime + 0.4);
            }, 150);
        } catch (error) {
            console.error("Error playing sound:", error);
        }
    }, []);

    // Get last seen message ID from localStorage (persistent across page navigations)
    const getLastSeenMessageId = useCallback(() => {
        if (typeof window !== 'undefined' && user?.id) {
            const stored = localStorage.getItem(`lastSeenMessageId_${user.id}`);
            return stored || null;
        }
        return null;
    }, [user?.id]);

    const setLastSeenMessageId = useCallback((messageId: string | null) => {
        if (typeof window !== 'undefined' && user?.id && messageId) {
            localStorage.setItem(`lastSeenMessageId_${user.id}`, messageId);
        }
    }, [user?.id]);

    // Memoize fetch functions
    const fetchMessagesMemo = useCallback(async () => {
        const { data, error } = await supabase
            .from("chat_messages")
            .select("*, users(username, avatar_url), places(id, name, image_url), pins(id, title, description, latitude, longitude, image_url, camera_image_url, radius, places(id, name, image_url))")
            .order("created_at", { ascending: true })
            .limit(50);

        if (!error && data) {
            setMessages(data);
            // Set last seen message ID when chat is opened
            if (isOpen && data.length > 0) {
                const lastMessageId = data[data.length - 1]?.id || null;
                if (lastMessageId) {
                    setLastSeenMessageId(lastMessageId);
                    if (onUnreadCountChange) {
                        onUnreadCountChange(0);
                    }
                }
            }
        }
    }, [isOpen, onUnreadCountChange, setLastSeenMessageId]);

    const fetchVotes = useCallback(async () => {
        const { data, error } = await supabase
            .from("radius_votes")
            .select("*, users(username)")
            .order("created_at", { ascending: true });

        if (!error && data) {
            setVotes(data);
        }
    }, []);

    const subscribeToMessages = useCallback(() => {
        const channel = supabase
            .channel("chat_messages")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "chat_messages",
                },
                (payload) => {
                    if (payload.eventType === "INSERT") {
                        // Check if it's a new message from another user
                        const newMessage = payload.new as any;
                        if (newMessage && newMessage.user_id !== user?.id) {
                            // Play sound for new message from other users (only when chat is closed, like iOS notifications)
                            // This prevents sound spam when actively chatting
                            if (!isOpen) {
                                playMessageSound();
                            }
                        }
                        // Always fetch messages to update unread count
                        fetchMessagesMemo();
                    }
                }
            )
            .subscribe();

        return channel;
    }, [fetchMessagesMemo, user?.id, isOpen, playMessageSound]);

    const subscribeToVotes = useCallback(() => {
        const channel = supabase
            .channel("radius_votes")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "radius_votes",
                },
                (payload) => {
                    // Optimize: Only update specific vote instead of fetching all
                    if (payload.eventType === "INSERT" && payload.new) {
                        setVotes(prev => [...prev, payload.new as Vote]);
                    } else if (payload.eventType === "UPDATE" && payload.new) {
                        setVotes(prev => prev.map(v => v.id === payload.new.id ? payload.new as Vote : v));
                    } else if (payload.eventType === "DELETE" && payload.old) {
                        setVotes(prev => prev.filter(v => v.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        return channel;
    }, []);

    useEffect(() => {
        // Always subscribe to messages to track unread count
        fetchMessagesMemo();
        const messageChannel = subscribeToMessages();

        if (isOpen) {
            fetchVotes();
            const voteChannel = subscribeToVotes();
            channelsRef.current = [messageChannel, voteChannel];
        } else {
            channelsRef.current = [messageChannel];
        }

        return () => {
            // Cleanup subscriptions
            channelsRef.current.forEach(channel => {
                if (channel) {
                    supabase.removeChannel(channel);
                }
            });
            channelsRef.current = [];
        };
    }, [isOpen, fetchMessagesMemo, fetchVotes, subscribeToMessages, subscribeToVotes]);

    // When chat opens, mark all current messages as seen
    useEffect(() => {
        if (isOpen && messages.length > 0) {
            const lastMessageId = messages[messages.length - 1]?.id;
            if (lastMessageId) {
                setLastSeenMessageId(lastMessageId);
                if (onUnreadCountChange) {
                    onUnreadCountChange(0);
                }
            }
        }
    }, [isOpen, messages, setLastSeenMessageId, onUnreadCountChange]);


    // Update unread count when messages change (debounced)
    useEffect(() => {
        if (!isOpen && messages.length > 0 && onUnreadCountChange) {
            const timeoutId = setTimeout(() => {
                const lastSeenId = getLastSeenMessageId();
                if (lastSeenId) {
                    const lastSeenIndex = messages.findIndex(msg => msg.id === lastSeenId);
                    const unreadCount = lastSeenIndex >= 0
                        ? messages.length - lastSeenIndex - 1
                        : messages.length;
                    onUnreadCountChange(Math.max(0, unreadCount));
                } else if (messages.length > 0) {
                    // If no last seen ID, count all as unread initially
                    onUnreadCountChange(messages.length);
                }
            }, 300);

            return () => clearTimeout(timeoutId);
        }
    }, [messages, isOpen, onUnreadCountChange, getLastSeenMessageId]);

    const scrollToBottom = useCallback((instant = false) => {
        if (isOpen && messagesEndRef.current) {
            // Use requestAnimationFrame to ensure smooth scrolling
            requestAnimationFrame(() => {
                if (messagesEndRef.current) {
                    messagesEndRef.current.scrollIntoView({ 
                        behavior: instant ? "auto" : "smooth",
                        block: "end"
                    });
                }
            });
        }
    }, [isOpen]);

    // Only scroll when new message is added and chat is open (not on initial open)
    const previousMessagesLengthRef = useRef(0);
    const isInitialOpenRef = useRef(true);
    
    useEffect(() => {
        if (isOpen) {
            if (isInitialOpenRef.current) {
                // On initial open, scroll instantly without animation
                setTimeout(() => scrollToBottom(true), 100);
                isInitialOpenRef.current = false;
            } else if (messages.length > previousMessagesLengthRef.current) {
                // On new messages, scroll smoothly
                scrollToBottom(false);
            }
            previousMessagesLengthRef.current = messages.length;
        } else {
            // Reset when chat closes
            isInitialOpenRef.current = true;
        }
    }, [messages.length, isOpen, scrollToBottom]);


    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || loading) return;

        setLoading(true);
        const { error } = await supabase.from("chat_messages").insert([
            {
                user_id: user.id,
                message: newMessage.trim(),
                message_type: "text",
            },
        ]);

        if (!error) {
            setNewMessage("");
        }
        setLoading(false);
    };

    const updatePinRadiusFromVotes = useCallback(async (messageId: string, pinId: string, messageVotes?: Vote[]) => {
        try {
            // Always fetch fresh votes from DB to ensure accuracy
            const { data, error } = await supabase
                .from("radius_votes")
                .select("*")
                .eq("message_id", messageId);
            
            if (error) {
                console.error("Error fetching votes for radius update:", error);
                return;
            }

            const votesToUse = data || [];

            if (votesToUse.length === 0) {
                return; // No votes yet
            }

            // Count votes per range
            const voteCounts: Record<string, number> = {};
            votesToUse.forEach((vote) => {
                voteCounts[vote.radius_range] = (voteCounts[vote.radius_range] || 0) + 1;
            });

            // Find the range with most votes
            let maxVotes = 0;
            let mostVotedRange = "0-100";
            Object.entries(voteCounts).forEach(([range, count]) => {
                if (count > maxVotes) {
                    maxVotes = count;
                    mostVotedRange = range;
                }
            });

            // Convert range to meters (average of min and max)
            const [min, max] = mostVotedRange.split("-").map(Number);
            const averageRadius = Math.round((min + max) / 2);

            // Update pin radius
            const { error: updateError } = await supabase
                .from("pins")
                .update({ radius: averageRadius })
                .eq("id", pinId);
            
            if (updateError) {
                console.error("Error updating pin radius:", updateError);
            }
        } catch (error) {
            console.error("Error in updatePinRadiusFromVotes:", error);
        }
    }, []);

    // Update pin radius automatically when votes change (debounced)
    useEffect(() => {
        if (!isOpen) return;

        const timeoutId = setTimeout(() => {
            messages.forEach((msg) => {
                if (msg.message_type === "pin_notification" && msg.pin_id) {
                    updatePinRadiusFromVotes(msg.id, msg.pin_id);
                }
            });
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [votes, messages, isOpen, updatePinRadiusFromVotes]);

    const handleVote = useCallback(async (messageId: string, radiusRange: string, pinId?: string) => {
        if (!user) return;

        // Check if user already voted - each user can only vote once
        const existingVote = votes.find(
            (v) => v.message_id === messageId && v.user_id === user.id
        );

        // If user already voted, do nothing (no changes allowed)
        if (existingVote) {
            return;
        }

        // Optimistic UI update - immediately add vote to local state for instant feedback
        const tempVoteId = `temp-${Date.now()}`;
        const tempVote: Vote = {
            id: tempVoteId,
            user_id: user.id,
            message_id: messageId,
            radius_range: radiusRange,
            created_at: new Date().toISOString(),
        };
        setVotes(prev => [...prev, tempVote]);

        try {
            // Insert new vote
            const { data, error } = await supabase
                .from("radius_votes")
                .insert([
                    {
                        user_id: user.id,
                        message_id: messageId,
                        radius_range: radiusRange,
                    },
                ])
                .select()
                .single();
            
            if (error) {
                console.error("Error inserting vote:", error);
                // Revert optimistic update on error
                setVotes(prev => prev.filter(v => v.id !== tempVoteId));
                return;
            }
            
            // Replace temp vote with real vote from DB
            if (data) {
                setVotes(prev => prev.map(v => 
                    v.id === tempVoteId ? data as Vote : v
                ));
            }

            // Update pin radius based on most votes if pinId exists
            // Fetch fresh votes from DB after a short delay to ensure all votes are updated
            if (pinId) {
                setTimeout(async () => {
                    await updatePinRadiusFromVotes(messageId, pinId);
                }, 500);
            }
        } catch (error) {
            console.error("Error in handleVote:", error);
            // Revert optimistic update on error
            setVotes(prev => prev.filter(v => v.id !== tempVoteId));
        }
    }, [votes, user, updatePinRadiusFromVotes]);

    const getVoteCounts = useCallback((messageId: string): RadiusVote[] => {
        const messageVotes = votes.filter((v) => v.message_id === messageId);
        const userVoted = messageVotes.some((v) => v.user_id === user?.id);
        const userVoteRange = messageVotes.find((v) => v.user_id === user?.id)?.radius_range;

        return RADIUS_RANGES.map((range) => ({
            range,
            count: messageVotes.filter((v) => v.radius_range === range).length,
            userVoted: userVoted && userVoteRange === range,
        }));
    }, [votes, user?.id]);

    // Memoize vote counts per message
    const voteCountsMap = useMemo(() => {
        const map = new Map<string, RadiusVote[]>();
        messages.forEach(msg => {
            if (msg.message_type === "pin_notification" || msg.message_type === "place_notification") {
                map.set(msg.id, getVoteCounts(msg.id));
            }
        });
        return map;
    }, [messages, getVoteCounts]);

    return (
        <div 
            className={clsx(
                "fixed inset-0 z-[2000] ios-chat-container flex flex-col bg-black",
                isOpen ? "ios-chat-open" : "ios-chat-closed"
            )}
        >
            {/* Native iOS-style header */}
            <div className="bg-black border-b border-gray-800 pt-safe pb-3 px-4 flex items-center gap-3 shadow-sm flex-shrink-0">
                <button
                    onClick={onClose}
                    className="flex items-center justify-center w-10 h-10 -ml-2 active:opacity-50 transition-opacity"
                    aria-label="Zurück"
                >
                    <ArrowLeft className="w-6 h-6 text-white" />
                </button>
                <div className="flex items-center gap-2 flex-1">
                    <MessageCircle className="w-6 h-6 text-white" />
                    <h2 className="text-xl font-semibold text-white">Chat</h2>
                </div>
                <div className="w-10" /> {/* Spacer for centering */}
            </div>

            <div className="bg-black flex flex-col flex-1 overflow-hidden min-h-0">

                {/* Messages */}
                <div 
                    className="flex-1 overflow-y-auto space-y-4 px-4 py-4 chat-messages-container"
                >
                            {messages.map((msg) => (
                                <div key={msg.id} className="space-y-2">
                                    {msg.message_type === "pin_notification" && msg.pins ? (
                                        <div className="bg-green-50 border border-green-100 rounded-2xl p-4 shadow-sm">
                                            <div className="flex items-start gap-3">
                                                {msg.pins.places?.image_url && (
                                                    <img
                                                        src={msg.pins.places.image_url}
                                                        alt={msg.pins.places.name}
                                                        className="w-10 h-10 object-cover rounded-full border-2 border-green-300 shadow-sm"
                                                    />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-green-900">
                                                        {msg.users?.username || "Unbekannt"} hat {msg.message}
                                                    </p>
                                                    {msg.pins.places && (
                                                        <p className="text-xs font-bold text-green-700 mt-0.5 uppercase tracking-wide">
                                                            {msg.pins.places.name}
                                                        </p>
                                                    )}
                                                    {msg.pins.title && (
                                                        <p className="text-sm font-medium text-gray-900 mt-1">
                                                            {msg.pins.title}
                                                        </p>
                                                    )}
                                                    {msg.pins.description && (
                                                        <p className="text-xs text-gray-600 mt-1 bg-white/60 p-2 rounded-lg italic">
                                                            "{msg.pins.description}"
                                                        </p>
                                                    )}

                                                    {/* Image Gallery with Swiper */}
                                                    {(msg.pins.camera_image_url || msg.pins.image_url) && (
                                                        <div className="mt-3 rounded-xl overflow-hidden shadow-sm border border-green-100">
                                                            <Swiper
                                                                modules={[Pagination]}
                                                                pagination={{ clickable: true }}
                                                                spaceBetween={10}
                                                                slidesPerView={1}
                                                                className="w-full h-48 bg-gray-100"
                                                            >
                                                                {msg.pins.camera_image_url && (
                                                                    <SwiperSlide>
                                                                        <img
                                                                            src={msg.pins.camera_image_url}
                                                                            alt="Kamera Foto"
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                    </SwiperSlide>
                                                                )}
                                                                {msg.pins.image_url && (
                                                                    <SwiperSlide>
                                                                        <img
                                                                            src={msg.pins.image_url}
                                                                            alt="Ort Foto"
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                    </SwiperSlide>
                                                                )}
                                                            </Swiper>
                                                        </div>
                                                    )}

                                                    <p className="text-[10px] text-gray-400 mt-2 text-right">
                                                        {new Date(msg.created_at).toLocaleString("de-DE", { hour: '2-digit', minute: '2-digit' })}
                                                    </p>

                                                    {/* Voting Section */}
                                                    <div className="mt-3 pt-3 border-t border-green-200/50">
                                                        <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">
                                                            Radius abstimmen
                                                        </p>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {RADIUS_RANGES.map((range) => {
                                                                const voteCounts = voteCountsMap.get(msg.id) || [];
                                                                const voteInfo = voteCounts.find((v) => v.range === range);
                                                                const isUserVote = voteInfo?.userVoted;
                                                                // Check if user has already voted (for any range in this message)
                                                                const userHasVoted = voteCounts.some((v) => v.userVoted);

                                                                return (
                                                                    <button
                                                                        key={range}
                                                                        onClick={() => handleVote(msg.id, range, msg.pin_id)}
                                                                        disabled={userHasVoted && !isUserVote}
                                                                        className={clsx(
                                                                            "relative text-[10px] py-2 px-1 rounded-lg border transition-all",
                                                                            userHasVoted && !isUserVote
                                                                                ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-50"
                                                                                : isUserVote
                                                                                ? "bg-green-600 text-white border-green-600 font-bold shadow-md active:scale-95"
                                                                                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 active:scale-95"
                                                                        )}
                                                                    >
                                                                        {range}m
                                                                        {voteInfo && voteInfo.count > 0 && (
                                                                            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center border border-white shadow-sm">
                                                                                {voteInfo.count}
                                                                            </span>
                                                                        )}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : msg.message_type === "place_notification" && msg.place ? (
                                        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 shadow-sm">
                                            <div className="flex items-start gap-3">
                                                <img
                                                    src={msg.place.image_url}
                                                    alt={msg.place.name}
                                                    className="w-10 h-10 object-cover rounded-full border-2 border-indigo-300 shadow-sm"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-indigo-900">
                                                        {msg.users?.username || "Unbekannt"} hat hinzugefügt:
                                                    </p>
                                                    <p className="text-lg font-bold text-indigo-700 mt-0.5">
                                                        {msg.place.name}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 mt-1 text-right">
                                                        {new Date(msg.created_at).toLocaleString("de-DE", { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={clsx(
                                            "flex items-end gap-2",
                                            msg.user_id === user?.id ? "flex-row-reverse" : "flex-row"
                                        )}>
                                            {msg.users?.avatar_url && msg.users.avatar_url.startsWith('http') ? (
                                                <img
                                                    src={getAvatarUrl(msg.users.avatar_url) || ''}
                                                    alt={msg.users.username}
                                                    className="flex-shrink-0 w-8 h-8 rounded-full object-cover shadow-sm border border-gray-200"
                                                    loading="lazy"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                                        if (fallback) fallback.style.display = 'flex';
                                                    }}
                                                />
                                            ) : null}
                                            <div
                                                className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-sm text-white text-xs font-bold"
                                                style={{ display: msg.users?.avatar_url && msg.users.avatar_url.startsWith('http') ? 'none' : 'flex' }}
                                            >
                                                {getUserInitials(msg.users?.username)}
                                            </div>
                                            <div className={clsx(
                                                "max-w-[80%] rounded-2xl p-3 shadow-sm",
                                                msg.user_id === user?.id
                                                    ? "bg-indigo-600 text-white rounded-br-none"
                                                    : "bg-gray-800 text-white rounded-bl-none"
                                            )}>
                                                {msg.user_id !== user?.id && (
                                                    <p className="text-[10px] font-bold opacity-70 mb-1 text-gray-300">
                                                        {msg.users?.username || "Unbekannt"}
                                                    </p>
                                                )}
                                                <p className="text-sm leading-relaxed text-white">{msg.message}</p>
                                                <p className={clsx(
                                                    "text-[10px] mt-1 text-right",
                                                    msg.user_id === user?.id ? "text-indigo-200" : "text-gray-400"
                                                )}>
                                                    {new Date(msg.created_at).toLocaleString("de-DE", { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="border-t border-gray-800 bg-black pb-safe px-4 pt-3 flex-shrink-0">
                    <div className="flex gap-2 items-end">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Nachricht schreiben..."
                            className="flex-1 rounded-2xl border-2 border-gray-700 bg-gray-800 text-white placeholder-gray-400 px-4 py-3 text-base focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            autoComplete="off"
                            autoCorrect="on"
                            autoCapitalize="sentences"
                            enterKeyHint="send"
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim()}
                            className="bg-indigo-600 text-white p-3 rounded-2xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex-shrink-0"
                        >
                            <Send className="w-6 h-6" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
