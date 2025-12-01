"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ConfirmDialog";
import Toast from "@/components/Toast";

type Place = {
    id: string;
    name: string;
    image_url: string;
    user_id: string;
    color?: string;
    created_at: string;
    users?: { username: string };
};

export default function MyPinsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"pins" | "places">("pins");
    const [pins, setPins] = useState<any[]>([]);
    const [places, setPlaces] = useState<Place[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [deleteType, setDeleteType] = useState<"pin" | "place">("pin");
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const [showPlaceModal, setShowPlaceModal] = useState(false);
    const [placeName, setPlaceName] = useState("");
    const [placeImage, setPlaceImage] = useState<File | null>(null);
    const [placeImagePreview, setPlaceImagePreview] = useState<string | null>(null);
    const [placeColor, setPlaceColor] = useState<string>("#3B82F6");
    const [placeLoading, setPlaceLoading] = useState(false);

    const presetColors = [
        "#3B82F6", // Blau
        "#EF4444", // Rot
        "#10B981", // Grün
        "#F59E0B", // Orange
        "#8B5CF6", // Lila
        "#EC4899", // Pink
        "#06B6D4", // Cyan
        "#84CC16", // Limette
        "#F97316", // Orange-Rot
        "#14B8A6", // Türkis
        "#A855F7", // Violett
        "#F43F5E", // Rose
        "#0EA5E9", // Hellblau
        "#22C55E", // Hellgrün
        "#EAB308", // Gelb
        "#6366F1"  // Indigo
    ];

    const fetchData = async () => {
        // Fetch pins
        const { data: pinsData } = await supabase
            .from("pins")
            .select("*")
            .eq("user_id", user!.id)
            .order("created_at", { ascending: false });

        if (pinsData) {
            setPins(pinsData);
        }

        // Fetch all places (everyone can see all places)
        const { data: placesData } = await supabase
            .from("places")
            .select("*, users(username)")
            .order("name", { ascending: true });

        if (placesData) {
            setPlaces(placesData);
        }

        setLoading(false);
    };

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    const handleDeletePin = async (pinId: string) => {
        setDeleteType("pin");
        setDeleteConfirm(pinId);
    };

    const handleDeletePlace = async (placeId: string) => {
        setDeleteType("place");
        setDeleteConfirm(placeId);
    };

    const confirmDelete = async () => {
        if (!deleteConfirm) return;

        if (deleteType === "pin") {
            const { error } = await supabase
                .from("pins")
                .delete()
                .eq("id", deleteConfirm);

            if (!error) {
                setPins(pins.filter((p) => p.id !== deleteConfirm));
                setToast({ message: "PL erfolgreich gelöscht!", type: "success" });
            } else {
                setToast({ message: "Fehler beim Löschen der PL", type: "error" });
            }
        } else {
            const { error } = await supabase
                .from("places")
                .delete()
                .eq("id", deleteConfirm);

            if (!error) {
                setPlaces(places.filter((p) => p.id !== deleteConfirm));
                setToast({ message: "Person erfolgreich gelöscht!", type: "success" });
            } else {
                setToast({ message: "Fehler beim Löschen der Person", type: "error" });
            }
        }
        setDeleteConfirm(null);
    };

    const handlePlaceImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPlaceImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPlaceImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAddPlace = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !placeName || !placeImage) return;

        setPlaceLoading(true);

        try {
            // Upload image
            const fileExt = placeImage.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;
            const filePath = `places/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('pin-images')
                .upload(filePath, placeImage, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                setToast({ message: `Bild konnte nicht hochgeladen werden: ${uploadError.message}`, type: "error" });
                setPlaceLoading(false);
                return;
            }

            const { data: urlData } = supabase.storage
                .from('pin-images')
                .getPublicUrl(filePath);

            const imageUrl = urlData.publicUrl;

            // Create place
            const { data: placeData, error } = await supabase
                .from("places")
                .insert([{
                    user_id: user.id,
                    name: placeName,
                    image_url: imageUrl,
                    color: placeColor
                }])
                .select()
                .single();

            if (error) {
                setToast({ message: `Person konnte nicht erstellt werden: ${error.message}`, type: "error" });
            } else {
                // Send notification to chat
                if (placeData) {
                    await supabase.from("chat_messages").insert([
                        {
                            user_id: user.id,
                            message: `${placeName} wurde hinzugefügt`,
                            message_type: "place_notification",
                            place_id: placeData.id,
                        },
                    ]);
                }

                setToast({ message: "Person erfolgreich erstellt!", type: "success" });
                setShowPlaceModal(false);
                setPlaceName("");
                setPlaceImage(null);
                setPlaceImagePreview(null);
                setPlaceColor("#3B82F6");
                fetchData();
            }
        } catch (error: any) {
            setToast({ message: `Fehler: ${error.message}`, type: "error" });
        }

        setPlaceLoading(false);
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-gray-50 p-4 pb-24 overflow-y-auto">
            <div className="mx-auto max-w-4xl space-y-6">
                <h1 className="text-2xl font-bold text-gray-900">Meine PLs</h1>

                {/* Tabs */}
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab("pins")}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "pins"
                                ? "border-indigo-500 text-indigo-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                }`}
                        >
                            Meine PLs
                        </button>
                        <button
                            onClick={() => setActiveTab("places")}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "places"
                                ? "border-indigo-500 text-indigo-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                }`}
                        >
                            Personen
                        </button>
                    </nav>
                </div>

                {loading ? (
                    <div className="text-center py-8">Lädt...</div>
                ) : activeTab === "pins" ? (
                    pins.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            Sie haben noch keine PLs hinzugefügt.
                            <br />
                            <button
                                onClick={() => router.push("/map")}
                                className="mt-4 text-indigo-600 font-semibold hover:underline"
                            >
                                Zur Karte
                            </button>
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                            {pins.map((pin) => (
                                <div key={pin.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                                    <div>
                                        {pin.image_url && (
                                            <img
                                                src={pin.image_url}
                                                alt={pin.title}
                                                className="w-full h-32 object-cover rounded-md mb-2"
                                            />
                                        )}
                                        <h3 className="font-bold text-lg text-gray-900">{pin.title}</h3>
                                        <p className="text-gray-600 text-sm mt-1">{pin.description || "Keine Beschreibung"}</p>
                                        {pin.camera_image_url && (
                                            <img
                                                src={pin.camera_image_url}
                                                alt="Aufgenommenes Foto"
                                                className="w-full h-32 object-cover rounded-md mt-2 border border-gray-300"
                                            />
                                        )}
                                        {pin.created_at && (
                                            <p className="text-xs text-gray-400 mt-2">
                                                {new Date(pin.created_at).toLocaleDateString('de-DE', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        )}
                                        <p className="text-xs text-gray-400 mt-1">
                                            Lat: {pin.latitude.toFixed(4)}, Lng: {pin.longitude.toFixed(4)}
                                        </p>
                                    </div>
                                    <div className="mt-4 flex justify-end">
                                        <button
                                            onClick={() => handleDeletePin(pin.id)}
                                            className="text-sm text-red-600 hover:text-red-800 font-medium"
                                        >
                                            Löschen
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    <div>
                        <div className="mb-4 flex justify-end">
                            <button
                                onClick={() => setShowPlaceModal(true)}
                                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                            >
                                + Person hinzufügen
                            </button>
                        </div>
                        {places.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                Noch keine Personen vorhanden.
                            </div>
                        ) : (
                            <div className="grid gap-3 grid-cols-4 sm:grid-cols-6 md:grid-cols-8">
                                {places.map((place) => (
                                    <div key={place.id} className="flex flex-col items-center">
                                        <div className="relative">
                                            <img
                                                src={place.image_url}
                                                alt={place.name}
                                                className="w-16 h-16 object-cover rounded-full border-4"
                                                style={{ borderColor: place.color || '#3B82F6' }}
                                            />
                                        </div>
                                        <p className="text-xs text-gray-700 mt-2 text-center font-medium">{place.name}</p>

                                        {place.user_id === user?.id && (
                                            <button
                                                onClick={() => handleDeletePlace(place.id)}
                                                className="text-xs text-red-600 hover:text-red-800 font-medium mt-1"
                                            >
                                                Löschen
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Place Modal */}
            {showPlaceModal && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
                        <h3 className="text-lg font-bold text-gray-900">Neue Person</h3>
                        <form onSubmit={handleAddPlace} className="mt-4 space-y-4">
                            <div>
                                <label htmlFor="placeName" className="block text-sm font-medium text-gray-900">
                                    Name
                                </label>
                                <input
                                    type="text"
                                    id="placeName"
                                    required
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 text-gray-900"
                                    value={placeName}
                                    onChange={(e) => setPlaceName(e.target.value)}
                                    placeholder="z.B. name, oderso , ..."
                                />
                            </div>
                            <div>
                                <label htmlFor="placeImage" className="block text-sm font-medium text-gray-900">
                                    Bild
                                </label>
                                <input
                                    type="file"
                                    id="placeImage"
                                    accept="image/*"
                                    required
                                    className="mt-1 block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                    onChange={handlePlaceImageChange}
                                />
                                {placeImagePreview && (
                                    <div className="mt-2">
                                        <img
                                            src={placeImagePreview}
                                            alt="Vorschau"
                                            className="w-full h-32 object-cover rounded-md border border-gray-300"
                                        />
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-2">
                                    Farbe auswählen
                                </label>
                                <div className="grid grid-cols-8 gap-2 mb-3">
                                    {presetColors.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setPlaceColor(color)}
                                            className={`w-10 h-10 rounded-full border-2 transition-transform ${placeColor === color
                                                ? "border-gray-900 scale-110 ring-2 ring-gray-400"
                                                : "border-gray-300 hover:scale-105"
                                                }`}
                                            style={{ backgroundColor: color }}
                                            title={color}
                                        />
                                    ))}
                                </div>
                                <div className="mt-2">
                                    <label className="block text-xs text-gray-600 mb-1">Oder eigene Farbe wählen:</label>
                                    <input
                                        type="color"
                                        value={placeColor}
                                        onChange={(e) => setPlaceColor(e.target.value)}
                                        className="w-full h-10 rounded-md border border-gray-300 cursor-pointer"
                                    />
                                    <div className="mt-2 flex items-center gap-2">
                                        <div
                                            className="w-8 h-8 rounded-full border-2 border-gray-300"
                                            style={{ backgroundColor: placeColor }}
                                        />
                                        <span className="text-xs text-gray-600">{placeColor}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPlaceModal(false);
                                        setPlaceName("");
                                        setPlaceImage(null);
                                        setPlaceImagePreview(null);
                                        setPlaceColor("#3B82F6");
                                    }}
                                    className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                                >
                                    Abbrechen
                                </button>
                                <button
                                    type="submit"
                                    disabled={placeLoading}
                                    className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-70"
                                >
                                    {placeLoading ? "Speichern..." : "Person hinzufügen"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={deleteConfirm !== null}
                title={deleteType === "pin" ? "PL löschen" : "Person löschen"}
                message={`Möchten Sie ${deleteType === "pin" ? "diese PL" : "diese Person"} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteConfirm(null)}
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
