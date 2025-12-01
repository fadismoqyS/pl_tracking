"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { ArrowLeft } from "lucide-react";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import clsx from "clsx";
import { compressImage } from "@/lib/imageCompression";

type Place = {
    id: string;
    name: string;
    image_url: string;
    color?: string;
};

type PinModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (title: string, description: string, placeId: string | null, radius: number, cameraImage?: File) => Promise<void>;
    loading: boolean;
};

export default function PinModal({ isOpen, onClose, onSubmit, loading }: PinModalProps) {
    const { user } = useAuth();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
    const [places, setPlaces] = useState<Place[]>([]);
    const [selectedPlaceImage, setSelectedPlaceImage] = useState<string | null>(null);
    const [selectedPlaceColor, setSelectedPlaceColor] = useState<string | null>(null);
    const [radius, setRadius] = useState<number>(100);
    const [cameraImage, setCameraImage] = useState<File | null>(null);
    const [cameraImagePreview, setCameraImagePreview] = useState<string | null>(null);
    const radiusSliderRef = useRef<HTMLInputElement>(null);
    const sliderContainerRef = useRef<HTMLDivElement>(null);
    const isDraggingRef = useRef(false);

    const fetchPlaces = useCallback(async () => {
        const { data } = await supabase
            .from("places")
            .select("id, name, image_url, color")
            .order("name", { ascending: true });

        if (data) {
            setPlaces(data);
        }
    }, []);

    useEffect(() => {
        if (isOpen && user && places.length === 0) {
            fetchPlaces();
        }
    }, [isOpen, user, places.length, fetchPlaces]);

    // Reset form when modal closes
    useEffect(() => {
        if (!isOpen) {
            setTitle("");
            setDescription("");
            setSelectedPlaceId(null);
            setSelectedPlaceImage(null);
            setSelectedPlaceColor(null);
            setRadius(100);
            setCameraImage(null);
            setCameraImagePreview(null);
        }
    }, [isOpen]);

    const takePicture = async () => {
        try {
            const image = await Camera.getPhoto({
                quality: 90,
                allowEditing: false,
                resultType: CameraResultType.Uri,
                source: CameraSource.Camera,
                saveToGallery: false,
            });

            if (image.webPath) {
                const response = await fetch(image.webPath);
                const blob = await response.blob();
                const originalFile = new File([blob], `camera-${Date.now()}.${image.format}`, { type: `image/${image.format}` });

                // Compress image for faster loading
                const compressedFile = await compressImage(originalFile, 1200, 0.85); // 1200px max for photos

                setCameraImage(compressedFile);
                setCameraImagePreview(image.webPath);
            }
        } catch (error) {
            console.error("Camera error:", error);
            // User cancelled or error
        }
    };

    const handlePlaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const placeId = e.target.value || null;
        setSelectedPlaceId(placeId);

        if (placeId) {
            const place = places.find(p => p.id === placeId);
            if (place) {
                setSelectedPlaceImage(place.image_url);
                setSelectedPlaceColor(place.color || '#3B82F6');
            }
        } else {
            setSelectedPlaceImage(null);
            setSelectedPlaceColor(null);
        }
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedPlaceId) {
            alert("Bitte wählen Sie eine Person aus.");
            return;
        }

        if (!radius || radius === 0) {
            alert("Bitte wählen Sie einen Radius größer als 0 m.");
            return;
        }

        await onSubmit(title, description, selectedPlaceId, radius, cameraImage || undefined);
        // Form reset is handled by useEffect on isOpen change
    };

    return (
        <div 
            className={clsx(
                "fixed inset-0 z-[2000] ios-modal-container flex flex-col",
                isOpen ? "ios-modal-open" : "ios-modal-closed"
            )}
        >
            {/* Native iOS-style header */}
            <div className="bg-white border-b border-gray-200 pt-safe pb-3 px-4 flex items-center gap-3 shadow-sm flex-shrink-0">
                <button
                    onClick={onClose}
                    className="flex items-center justify-center w-10 h-10 -ml-2 active:opacity-50 transition-opacity"
                    aria-label="Zurück"
                >
                    <ArrowLeft className="w-6 h-6 text-indigo-600" />
                </button>
                <div className="flex items-center gap-2 flex-1">
                    <h2 className="text-xl font-semibold text-gray-900">Neue PL hinzufügen</h2>
                </div>
                <div className="w-10" /> {/* Spacer for centering */}
            </div>

            <div className="bg-white flex flex-col flex-1 overflow-y-auto min-h-0 modal-scroll-container">
                <div className="max-w-md mx-auto w-full px-4 py-6">
                    <div className="flex justify-center mb-4">
                        <img
                            src="/poop.png"
                            alt="Poop"
                            className="w-20 h-20 object-contain"
                        />
                    </div>
                    <p className="text-gray-600 mb-6 text-center text-sm">
                        Markiere einen neuen Ort auf der Karte.
                    </p>

                            <form id="pin-form" onSubmit={handleSubmit} className="space-y-5 pb-safe">
                                <div>
                                    <label htmlFor="title" className="block text-sm font-medium text-gray-900 mb-1">
                                        Titel <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="title"
                                        required
                                        className="block w-full rounded-2xl border-2 border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-base p-4 text-gray-900 bg-white transition-all"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="z.B. Schöne Aussicht"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="description" className="block text-sm font-medium text-gray-900 mb-1">
                                        Beschreibung
                                    </label>
                                    <textarea
                                        id="description"
                                        className="block w-full rounded-2xl border-2 border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-base p-4 text-gray-900 bg-white transition-all"
                                        rows={3}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Was ist hier besonders?"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-2">
                                        Foto
                                    </label>
                                    {!cameraImagePreview ? (
                                        <button
                                            type="button"
                                            onClick={takePicture}
                                            className="w-full rounded-2xl bg-indigo-50 px-4 py-5 text-base font-semibold text-indigo-700 hover:bg-indigo-100 border-2 border-dashed border-indigo-300 flex items-center justify-center gap-3 transition-all active:scale-95"
                                        >
                                            <span className="text-2xl">📷</span> Foto aufnehmen
                                        </button>
                                    ) : (
                                        <div className="relative rounded-xl overflow-hidden border border-gray-200" style={{ zIndex: 1 }}>
                                            <img
                                                src={cameraImagePreview}
                                                alt="Aufgenommenes Foto"
                                                className="w-full h-48 object-cover"
                                                style={{ pointerEvents: 'none' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCameraImage(null);
                                                    setCameraImagePreview(null);
                                                }}
                                                className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors z-20"
                                                style={{ pointerEvents: 'auto' }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="place" className="block text-sm font-medium text-gray-900 mb-1">
                                        Person <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        id="place"
                                        required
                                        className="block w-full rounded-2xl border-2 border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-base p-4 text-gray-900 bg-white transition-all"
                                        value={selectedPlaceId || ""}
                                        onChange={handlePlaceChange}
                                    >
                                        <option value="">-- Person auswählen --</option>
                                        {places.map((place) => (
                                            <option key={place.id} value={place.id}>
                                                {place.name}
                                            </option>
                                        ))}
                                    </select>

                                    {selectedPlaceImage && (
                                        <div className="mt-3 flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                                            <img
                                                src={selectedPlaceImage}
                                                alt="Person Vorschau"
                                                className="w-12 h-12 object-cover rounded-full border-2"
                                                style={{ borderColor: selectedPlaceColor || '#3B82F6' }}
                                            />
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">Ausgewählte Person</p>
                                                {selectedPlaceColor && (
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <div
                                                            className="w-3 h-3 rounded-full"
                                                            style={{ backgroundColor: selectedPlaceColor }}
                                                        />
                                                        <span className="text-xs text-gray-500">Farbcode: {selectedPlaceColor}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="radius-control-wrapper" ref={sliderContainerRef}>
                                    <div className="flex justify-between items-center mb-3">
                                        <label htmlFor="radius" className="block text-base font-semibold text-gray-900">
                                            Radius
                                        </label>
                                        <span className="text-lg font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-xl border-2 border-indigo-200">
                                            {radius} m
                                        </span>
                                    </div>
                                    <div 
                                        className="py-4 px-2 radius-slider-container"
                                        onTouchStart={(e) => {
                                            isDraggingRef.current = true;
                                            e.stopPropagation();
                                        }}
                                        onTouchMove={(e) => {
                                            if (isDraggingRef.current) {
                                                e.stopPropagation();
                                            }
                                        }}
                                        onTouchEnd={(e) => {
                                            isDraggingRef.current = false;
                                            e.stopPropagation();
                                        }}
                                    >
                                        <input
                                            ref={radiusSliderRef}
                                            type="range"
                                            id="radius"
                                            min="100"
                                            max="5000"
                                            step="50"
                                            value={radius}
                                            onChange={(e) => {
                                                const newValue = parseFloat(e.target.value);
                                                setRadius(newValue);
                                            }}
                                            onTouchStart={(e) => e.stopPropagation()}
                                            onTouchMove={(e) => e.stopPropagation()}
                                            onTouchEnd={(e) => e.stopPropagation()}
                                            className="w-full radius-slider-native"
                                            style={{
                                                '--range-progress': `${((radius - 100) / (5000 - 100)) * 100}%`
                                            } as React.CSSProperties}
                                            required
                                        />
                                    </div>
                                    <div className="flex justify-between text-sm text-gray-500 mt-2 font-medium">
                                        <span>100 m</span>
                                        <span>5000 m</span>
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="flex-1 rounded-2xl bg-gray-100 px-4 py-4 text-base font-bold text-gray-700 hover:bg-gray-200 active:scale-95 transition-all"
                                    >
                                        Abbrechen
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-[2] rounded-2xl bg-indigo-600 px-4 py-4 text-base font-bold text-white shadow-lg shadow-indigo-300 hover:bg-indigo-500 active:scale-95 transition-all disabled:opacity-70 disabled:scale-100"
                                    >
                                        {loading ? "Speichern..." : "PL hinzufügen"}
                                    </button>
                                </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
