"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Map, { Marker, NavigationControl, Source, Layer, MapRef, Popup } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import PinModal from "./PinModal";
import Chat from "./Chat";
import Toast from "./Toast";
import AddressModal from "./AddressModal";
import ImageGallery from "./ImageGallery";
import { MessageCircle, Plus, Navigation, Search, Map as MapIcon, Satellite } from "lucide-react";

type Place = {
    id: string;
    name: string;
    image_url: string;
    color?: string;
};

type Pin = {
    id: string;
    title: string;
    description?: string;
    latitude: number;
    longitude: number;
    place_id: string;
    user_id: string;
    created_at: string;
    image_url?: string;
    camera_image_url?: string;
    radius: number;
    places?: Place;
    users?: {
        username: string;
        avatar_url?: string;
    };
};

type LiveUserLocation = {
    user_id: string;
    latitude: number;
    longitude: number;
    updated_at: string;
    users?: {
        username: string;
        avatar_url?: string;
    };
};

// Helle, weiße Standardkarte (wie am Anfang)
const MAP_STYLE_STANDARD =
    "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

// Satellite style using Esri World Imagery with detailed labels (free, no API key required)
const MAP_STYLE_SATELLITE: any = {
    version: 8,
    sources: {
        "satellite": {
            type: "raster",
            tiles: [
                "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            ],
            tileSize: 256,
            attribution: "© Esri"
        },
        "labels": {
            type: "raster",
            tiles: [
                "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places_Alternate/MapServer/tile/{z}/{y}/{x}"
            ],
            tileSize: 256,
            attribution: "© Esri"
        },
        "streets": {
            type: "raster",
            tiles: [
                "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Reference_Overlay/MapServer/tile/{z}/{y}/{x}"
            ],
            tileSize: 256,
            attribution: "© Esri"
        }
    },
    layers: [
        {
            id: "satellite-layer",
            type: "raster",
            source: "satellite",
            minzoom: 0,
            maxzoom: 22
        },
        {
            id: "streets-layer",
            type: "raster",
            source: "streets",
            minzoom: 0,
            maxzoom: 22
        },
        {
            id: "labels-layer",
            type: "raster",
            source: "labels",
            minzoom: 0,
            maxzoom: 22
        }
    ]
};

export default function MapComponent() {
    const { user } = useAuth();
    const mapRef = useRef<MapRef>(null);
    const [pins, setPins] = useState<Pin[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showRanking, setShowRanking] = useState(false);
    const [viewState, setViewState] = useState({
        longitude: 7.3,
        latitude: 52.7,
        zoom: 10
    });
    const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
    const [newPinPosition, setNewPinPosition] = useState<{ lat: number; lng: number } | null>(null);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [galleryImages, setGalleryImages] = useState<string[]>([]);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);
    const [mapType, setMapType] = useState<"standard" | "satellite">("standard");
    const [liveUsers, setLiveUsers] = useState<LiveUserLocation[]>([]);

    // Fetch pins from Supabase
    const fetchPins = useCallback(async () => {
        const { data, error } = await supabase
            .from("pins")
            .select("*, places(*), users(username, avatar_url)")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching pins:", error);
        } else {
            setPins(data || []);
        }
    }, []);

    // Suppress empty error objects from MapLibre
    useEffect(() => {
        const originalError = console.error;
        console.error = (...args: any[]) => {
            // Filter out empty error objects
            const filtered = args.filter(arg => {
                if (typeof arg === 'object' && arg !== null) {
                    return Object.keys(arg).length > 0;
                }
                return true;
            });
            if (filtered.length > 0) {
                originalError(...filtered);
            }
        };

        return () => {
            console.error = originalError;
        };
    }, []);

    // Prevent keyboard from appearing on mount
    useEffect(() => {
        // Blur any focused input when component mounts
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            activeElement.blur();
        }
    }, []);

    // Subscribe to realtime changes
    useEffect(() => {
        fetchPins();

        const channel = supabase
            .channel("pins_channel")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "pins" },
                (payload) => {
                    if (payload.eventType === "INSERT") {
                        // Fetch full pin data to get relations
                        supabase
                            .from("pins")
                            .select("*, places(*), users(username, avatar_url)")
                            .eq("id", payload.new.id)
                            .single()
                            .then(({ data }) => {
                                if (data) {
                                    setPins((prev) => [data, ...prev]);
                                    setToast({ message: "Neuer Pin hinzugefügt!", type: "success" });
                                }
                            });
                    } else if (payload.eventType === "DELETE") {
                        setPins((prev) => prev.filter((pin) => pin.id !== payload.old.id));
                    } else if (payload.eventType === "UPDATE") {
                        // Update pin in list
                        setPins((prev) => prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchPins]);

    // Get user location
    useEffect(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setUserLocation({ lat: latitude, lng: longitude });
                    // Only fly to location if it's the first load
                    if (viewState.zoom === 6) {
                        setViewState(prev => ({
                            ...prev,
                            latitude,
                            longitude,
                            zoom: 14
                        }));
                    }
                },
                (error) => {
                    console.error("Error getting location:", error);
                    setToast({ message: "Standort konnte nicht ermittelt werden.", type: "error" });
                },
                { enableHighAccuracy: true }
            );
        }
    }, []);

    // Continuously update own live location while page is open
    useEffect(() => {
        if (!user) return;
        if (!("geolocation" in navigator)) return;

        const watchId = navigator.geolocation.watchPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setUserLocation({ lat: latitude, lng: longitude });

                try {
                    await supabase.from("user_locations").upsert({
                        user_id: user.id,
                        latitude,
                        longitude,
                        updated_at: new Date().toISOString()
                    });
                } catch (e) {
                    console.error("Error updating live location:", e);
                }
            },
            (error) => {
                console.error("Error watching location:", error);
            },
            {
                enableHighAccuracy: true,
                maximumAge: 5000,
                timeout: 10000
            }
        );

        return () => {
            navigator.geolocation.clearWatch(watchId);
        };
    }, [user]);

    // Fetch & subscribe to all users' live locations
    useEffect(() => {
        const fetchLocations = async () => {
            const { data, error } = await supabase
                .from("user_locations")
                .select("*, users(username, avatar_url)");

            if (!error && data) {
                setLiveUsers(data as LiveUserLocation[]);
            }
        };

        fetchLocations();

        const channel = supabase
            .channel("user_locations_live")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "user_locations" },
                (payload) => {
                    setLiveUsers((prev) => {
                        const list = [...prev];
                        if (payload.eventType === "DELETE") {
                            return list.filter(
                                (l) => l.user_id !== (payload.old as any).user_id
                            );
                        }
                        const row = payload.new as any;
                        const idx = list.findIndex((l) => l.user_id === row.user_id);
                        if (idx >= 0) {
                            list[idx] = { ...list[idx], ...row };
                        } else {
                            list.push(row);
                        }
                        return list;
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleAddPin = async (title: string, description: string, placeId: string | null, radius: number, cameraImage?: File) => {
        if (!user || !newPinPosition || !placeId) return;

        setLoading(true);
        try {
            let cameraImageUrl = null;

            // Upload camera image if exists
            if (cameraImage) {
                const fileExt = cameraImage.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `camera-uploads/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('pin-images')
                    .upload(filePath, cameraImage);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('pin-images')
                    .getPublicUrl(filePath);

                cameraImageUrl = publicUrl;
            }

            const { data: pinData, error } = await supabase
                .from("pins")
                .insert([
                    {
                        title,
                        description,
                        latitude: newPinPosition.lat,
                        longitude: newPinPosition.lng,
                        place_id: placeId,
                        user_id: user.id,
                        radius: radius,
                        camera_image_url: cameraImageUrl
                    },
                ])
                .select()
                .single();

            if (error) throw error;

            // Get place name for the chat message
            const { data: placeData } = await supabase
                .from("places")
                .select("name")
                .eq("id", placeId)
                .single();

            // Get city name via reverse geocoding
            let cityName = "unbekanntem Ort";
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${newPinPosition.lat}&lon=${newPinPosition.lng}&zoom=10&addressdetails=1`,
                    {
                        headers: {
                            'User-Agent': 'PL-Tracking-App'
                        }
                    }
                );
                const data = await response.json();
                if (data && data.address) {
                    cityName = data.address.city || data.address.town || data.address.village || data.address.municipality || "unbekanntem Ort";
                }
            } catch (geocodeError) {
                console.error("Geocoding error:", geocodeError);
            }

            const placeName = placeData?.name || "Unbekannt";

            // Add chat message for the new pin
            await supabase.from("chat_messages").insert([
                {
                    user_id: user.id,
                    message: `hat einen neuen PL von ${placeName} in ${cityName} platziert`,
                    message_type: "pin_notification",
                    pin_id: pinData.id
                },
            ]);

            setToast({ message: "Pin erfolgreich erstellt!", type: "success" });
            setIsModalOpen(false);
            setNewPinPosition(null);

            // Fly to new pin
            if (mapRef.current) {
                mapRef.current.flyTo({
                    center: [newPinPosition.lng, newPinPosition.lat],
                    zoom: 16
                });
            }
        } catch (error: any) {
            console.error("Error adding pin:", error);
            setToast({ message: error.message || "Fehler beim Erstellen des Pins", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    const handleLocateMe = () => {
        if (userLocation && mapRef.current) {
            mapRef.current.flyTo({
                center: [userLocation.lng, userLocation.lat],
                zoom: 16
            });
        } else {
            setToast({ message: "Standort wird noch ermittelt...", type: "error" });
        }
    };

    const handleAddressFound = (lat: number, lng: number) => {
        if (mapRef.current) {
            mapRef.current.flyTo({
                center: [lng, lat],
                zoom: 16
            });
            setNewPinPosition({ lat, lng });
            setToast({ message: "Adresse gefunden! Klicken Sie auf +, um einen Pin zu erstellen.", type: "success" });
        }
    };

    // Group pins by place for ranking
    const ranking = useMemo(() => {
        const counts: Record<string, { count: number; totalMeters: number; name: string; color: string; image: string }> = {};
        pins.forEach((pin) => {
            if (pin.places) {
                const placeId = pin.places.id;
                if (!counts[placeId]) {
                    counts[placeId] = {
                        count: 0,
                        totalMeters: 0,
                        name: pin.places.name,
                        color: pin.places.color || '#3B82F6',
                        image: pin.places.image_url
                    };
                }
                counts[placeId].count++;
                counts[placeId].totalMeters += pin.radius || 0;
            }
        });
        return Object.values(counts).sort((a, b) => b.count - a.count);
    }, [pins]);

    return (
        <div className="relative w-full h-screen overflow-hidden bg-gray-100">
            <Map
                ref={mapRef}
                {...viewState}
                onMove={evt => setViewState(evt.viewState)}
                style={{ width: "100%", height: "100%" }}
                mapStyle={mapType === "satellite" ? MAP_STYLE_SATELLITE : MAP_STYLE_STANDARD}
                attributionControl={false}
                onClick={(e) => {
                    // Only set new pin position if clicking on the map background
                    // This is handled by checking if the click target is the canvas
                    setNewPinPosition({ lat: e.lngLat.lat, lng: e.lngLat.lng });
                    setSelectedPin(null);
                }}
            >
                <NavigationControl position="top-left" />

                {/* Render Circles using GeoJSON Source and Layer for performance */}
                {pins.map((pin) => (
                    <Source
                        key={`source-${pin.id}`}
                        id={`source-${pin.id}`}
                        type="geojson"
                        data={{
                            type: 'Feature',
                            geometry: { type: 'Point', coordinates: [pin.longitude, pin.latitude] },
                            properties: {
                                radius: pin.radius,
                                color: pin.places?.color || '#3B82F6'
                            }
                        }}
                    >
                        <Layer
                            id={`layer-${pin.id}`}
                            type="circle"
                            paint={{
                                'circle-radius': [
                                    '*',
                                    ['get', 'radius'],
                                    [
                                        'interpolate',
                                        ['exponential', 2],
                                        ['zoom'],
                                        8, 0.15,
                                        10, 0.6,
                                        12, 2.4,
                                        14, 9.6,
                                        16, 38.4,
                                        18, 153.6,
                                        20, 614.4
                                    ]
                                ],
                                'circle-color': ['get', 'color'],
                                'circle-opacity': 0.4,
                                'circle-stroke-width': 5,
                                'circle-stroke-color': ['get', 'color'],
                                'circle-stroke-opacity': 1.0
                            }}
                        />
                    </Source>
                ))}

                {/* User Location Marker */}
                {userLocation && (
                    <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="center">
                        <div className="relative flex items-center justify-center w-6 h-6">
                            <div className="absolute w-full h-full bg-blue-500 rounded-full opacity-30 animate-ping"></div>
                            <div className="relative w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-md"></div>
                        </div>
                    </Marker>
                )}

                {/* Live user locations with profile images */}
                {liveUsers.map((loc) => (
                    <Marker
                        key={loc.user_id}
                        longitude={loc.longitude}
                        latitude={loc.latitude}
                        anchor="center"
                    >
                        <div className="flex flex-col items-center">
                            <div className="mb-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-white">
                                {`Standort von ${loc.users?.username || "Nutzer"}`}
                            </div>
                            <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-purple-500 shadow-lg bg-white">
                                <img
                                    src={loc.users?.avatar_url || "/manLOgo.jpeg"}
                                    alt={loc.users?.username || "User"}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-purple-500 -mt-1" />
                        </div>
                    </Marker>
                ))}

                {/* New Pin Position Marker */}
                {newPinPosition && (
                    <Marker longitude={newPinPosition.lng} latitude={newPinPosition.lat} anchor="bottom">
                        <div className="flex flex-col items-center group cursor-pointer transition-transform hover:scale-110 active:scale-95">
                            <div className="relative">
                                <div className="absolute inset-0 w-10 h-10 rounded-full bg-purple-400 opacity-50 animate-ping" />
                                <div
                                    className="relative w-10 h-10 rounded-full border-2 shadow-md overflow-hidden bg-white flex items-center justify-center"
                                    style={{ borderColor: '#8B5CF6' }}
                                >
                                    <Plus className="w-6 h-6 text-purple-600" />
                                </div>
                            </div>
                            <div
                                className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] -mt-1"
                                style={{ borderTopColor: '#8B5CF6' }}
                            />
                        </div>
                    </Marker>
                )}

                {/* Pin Markers */}
                {pins.map((pin, index) => (
                    <Marker
                        key={pin.id}
                        longitude={pin.longitude}
                        latitude={pin.latitude}
                        anchor="center"
                        onClick={e => {
                            e.originalEvent.stopPropagation();
                            setSelectedPin(pin);
                            setNewPinPosition(null);
                            // Zoom to the clicked pin
                            if (mapRef.current) {
                                mapRef.current.flyTo({
                                    center: [pin.longitude, pin.latitude],
                                    zoom: 16,
                                    duration: 1000
                                });
                            }
                        }}
                    >
                        <div className="flex flex-col items-center group cursor-pointer relative w-20 h-20">
                            {/* Floating poop icons around the pin - more icons for larger radius */}
                            {(() => {
                                // Calculate number of icons based on radius
                                // More radius = more poop icons, but maximum 15 icons
                                // Formula: 3 icons for small radius, up to 15 icons for large radius
                                const iconCount = Math.min(Math.max(Math.floor(pin.radius / 350), 3), 15);

                                // Fixed smaller distance to keep icons close to pin at all zoom levels
                                const radiusOffset = 18; // Fixed distance in pixels - close to pin

                                return [...Array(iconCount)].map((_, i) => {
                                    const angle = (i * 360 / iconCount) * (Math.PI / 180); // Distribute evenly around the pin
                                    const x = Math.cos(angle) * radiusOffset;
                                    const y = Math.sin(angle) * radiusOffset;
                                    return (
                                        <div
                                            key={`poop-${i}`}
                                            className={`floating-poop-icon ${i % 2 === 1 ? 'reverse' : ''}`}
                                            style={{
                                                left: `calc(50% + ${x}px)`,
                                                top: `calc(50% + ${y - 15}px)`,
                                                '--poop-delay': (index * iconCount + i),
                                                zIndex: 999, // Below pin
                                            } as React.CSSProperties}
                                        >
                                            <img
                                                src="/poop.png"
                                                alt="Floating poop"
                                                className="w-4 h-4 opacity-75 drop-shadow-lg"
                                            />
                                        </div>
                                    );
                                });
                            })()}

                            {/* Main pin - static, centered - above icons */}
                            <div className="relative w-10 h-10 rounded-full border-2 shadow-md overflow-hidden bg-white z-[1000]"
                                style={{
                                    borderColor: pin.places?.color || '#3B82F6'
                                }}
                            >
                                <img
                                    src={pin.places?.image_url || "/poop.png"}
                                    alt={pin.places?.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div
                                className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] -mt-1"
                                style={{ borderTopColor: pin.places?.color || '#3B82F6' }}
                            />
                        </div>
                    </Marker>
                ))}

                {/* Popup for Selected Pin */}
                {selectedPin && (
                    <Popup
                        longitude={selectedPin.longitude}
                        latitude={selectedPin.latitude}
                        anchor="bottom"
                        offset={15}
                        onClose={() => setSelectedPin(null)}
                        closeButton={true}
                        closeOnClick={false}
                        className="custom-popup"
                    >
                        <div className="p-3 min-w-[250px] max-w-[300px]">
                            <div className="flex items-start gap-3 mb-2">
                                <img
                                    src={selectedPin.places?.image_url}
                                    alt={selectedPin.places?.name}
                                    className="w-12 h-12 rounded-full object-cover border-2 flex-shrink-0"
                                    style={{ borderColor: selectedPin.places?.color || '#3B82F6' }}
                                />
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 text-base leading-tight">{selectedPin.title}</h3>
                                    <p className="text-xs text-gray-500 font-medium">{selectedPin.places?.name}</p>
                                </div>
                            </div>

                            {selectedPin.description && (
                                <p className="text-gray-700 text-sm mb-2 bg-gray-50 p-2 rounded-lg">
                                    {selectedPin.description}
                                </p>
                            )}

                            {(selectedPin.camera_image_url || selectedPin.image_url) && (
                                <div className="flex gap-2 overflow-x-auto pb-1 mb-2">
                                    {selectedPin.camera_image_url && (
                                        <img
                                            src={selectedPin.camera_image_url}
                                            alt="Camera"
                                            className="h-20 w-auto rounded-lg object-cover border border-gray-200 cursor-pointer active:scale-95 transition-transform"
                                            onClick={() => {
                                                const images = [];
                                                if (selectedPin.camera_image_url) images.push(selectedPin.camera_image_url);
                                                if (selectedPin.image_url) images.push(selectedPin.image_url);
                                                setGalleryImages(images);
                                                setGalleryInitialIndex(0);
                                                setIsGalleryOpen(true);
                                            }}
                                        />
                                    )}
                                    {selectedPin.image_url && (
                                        <img
                                            src={selectedPin.image_url}
                                            alt="Place"
                                            className="h-20 w-auto rounded-lg object-cover border border-gray-200 cursor-pointer active:scale-95 transition-transform"
                                            onClick={() => {
                                                const images = [];
                                                if (selectedPin.camera_image_url) images.push(selectedPin.camera_image_url);
                                                if (selectedPin.image_url) images.push(selectedPin.image_url);
                                                setGalleryImages(images);
                                                setGalleryInitialIndex(selectedPin.camera_image_url ? 1 : 0);
                                                setIsGalleryOpen(true);
                                            }}
                                        />
                                    )}
                                </div>
                            )}

                            <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
                                <span className="font-medium">📍 {selectedPin.radius}m</span>
                                <span>{new Date(selectedPin.created_at).toLocaleDateString('de-DE')}</span>
                            </div>
                        </div>
                    </Popup>
                )}
            </Map>

            {/* Ranking Button */}
            <button
                className="absolute top-[calc(1rem+env(safe-area-inset-top))] right-4 z-[1000] bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-full shadow-lg shadow-purple-300 font-bold text-sm flex items-center gap-2 border-2 border-white/20 active:scale-95 transition-all"
                onClick={() => setShowRanking(!showRanking)}
            >
                <span className="text-lg">🏆</span>
                <span className="hidden md:inline">Ranking</span>
            </button>

            {/* Ranking List */}
            {showRanking && (
                <div className="absolute top-[calc(4rem+env(safe-area-inset-top))] right-4 z-[1000] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-4 w-64 border border-gray-100 animate-in fade-in slide-in-from-top-5 duration-200">
                    <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <span>🏆</span> TOP PLS 💩 macher
                    </h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                        {ranking.map((place, index) => {
                            const totalKm = (place.totalMeters / 1000).toFixed(2);
                            const totalM = place.totalMeters;
                            return (
                                <div key={index} className="flex items-center justify-between p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <img
                                                src={place.image}
                                                alt={place.name}
                                                className="w-10 h-10 rounded-full object-cover border-2"
                                                style={{ borderColor: place.color }}
                                            />
                                            <div className="absolute -top-1 -left-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-[10px] font-bold text-yellow-900 shadow-sm border border-white">
                                                #{index + 1}
                                            </div>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm text-gray-900 truncate max-w-[80px]">{place.name}</span>
                                            <span className="text-xs text-gray-500">
                                                {totalM >= 1000 ? `${totalKm} km` : `${totalM} m`}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg text-xs">
                                        {place.count} 💩
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Mobile Controls */}
            <div className="absolute bottom-[calc(10rem+env(safe-area-inset-bottom))] right-4 flex flex-col gap-3 z-[1000]">
                <button
                    onClick={() => setShowAddressModal(true)}
                    className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-700 active:scale-90 transition-transform border border-gray-100"
                >
                    <Search className="w-6 h-6" />
                </button>

                <button
                    onClick={() => setMapType(mapType === "standard" ? "satellite" : "standard")}
                    className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-700 active:scale-90 transition-transform border border-gray-100"
                    title={mapType === "satellite" ? "Standard" : "Satellit"}
                >
                    {mapType === "satellite" ? (
                        <MapIcon className="w-6 h-6" />
                    ) : (
                        <Satellite className="w-6 h-6" />
                    )}
                </button>

                <button
                    onClick={handleLocateMe}
                    className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-700 active:scale-90 transition-transform border border-gray-100"
                >
                    <Navigation className="w-6 h-6" />
                </button>

                <button
                    onClick={() => setIsChatOpen(true)}
                    className="w-12 h-12 bg-indigo-600 rounded-full shadow-lg flex items-center justify-center text-white active:scale-90 transition-transform relative shadow-indigo-300"
                >
                    <MessageCircle className="w-6 h-6" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white">
                            {unreadCount}
                        </span>
                    )}
                </button>

                {newPinPosition && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="w-14 h-14 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full shadow-xl flex items-center justify-center text-white active:scale-90 transition-transform shadow-purple-300 border-2 border-white/20 animate-bounce"
                    >
                        <Plus className="w-8 h-8" />
                    </button>
                )}
            </div>

            {/* Modals */}
            <PinModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleAddPin}
                loading={loading}
            />

            <AddressModal
                isOpen={showAddressModal}
                onClose={() => setShowAddressModal(false)}
                onAddressFound={handleAddressFound}
            />

            <ImageGallery
                isOpen={isGalleryOpen}
                onClose={() => setIsGalleryOpen(false)}
                images={galleryImages}
                initialIndex={galleryInitialIndex}
            />

            <Chat
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                onUnreadCountChange={setUnreadCount}
            />

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
}
