"use client";

import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import clsx from "clsx";

type AddressModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onAddressFound: (lat: number, lng: number) => void;
};

export default function AddressModal({ isOpen, onClose, onAddressFound }: AddressModalProps) {
    const [address, setAddress] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const geocodeAddress = async (addressString: string) => {
        setLoading(true);
        setError(null);

        try {
            // Using OpenStreetMap Nominatim API for geocoding (free, no API key needed)
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressString)}&limit=1`,
                {
                    headers: {
                        'User-Agent': 'PL-Tracking-App' // Required by Nominatim
                    }
                }
            );

            const data = await response.json();

            if (data && data.length > 0) {
                const result = data[0];
                const lat = parseFloat(result.lat);
                const lng = parseFloat(result.lon);
                onAddressFound(lat, lng);
                setAddress("");
                onClose();
            } else {
                setError("Adresse nicht gefunden. Bitte versuchen Sie eine andere Adresse.");
            }
        } catch (err) {
            console.error("Geocoding error:", err);
            setError("Fehler beim Suchen der Adresse. Bitte versuchen Sie es erneut.");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!address.trim()) {
            setError("Bitte geben Sie eine Adresse ein.");
            return;
        }
        await geocodeAddress(address.trim());
    };

    // Focus input when modal opens (but only if modal is actually open)
    useEffect(() => {
        if (isOpen) {
            // Small delay to ensure modal is rendered
            const timer = setTimeout(() => {
                const input = document.getElementById('address');
                if (input) {
                    input.focus();
                }
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

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
                    <h2 className="text-xl font-semibold text-gray-900">Adresse eingeben</h2>
                </div>
                <div className="w-10" /> {/* Spacer for centering */}
            </div>

            <div className="bg-white flex flex-col flex-1 overflow-y-auto min-h-0">
                <div className="max-w-md mx-auto w-full px-4 py-6">
                    <p className="text-sm text-gray-600 text-center mb-6">
                        Geben Sie eine Adresse ein, um eine PL hinzuzufügen
                    </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="address" className="block text-sm font-medium text-gray-900 mb-2">
                            Adresse <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="address"
                            required
                            className="w-full rounded-2xl border-2 border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-base p-4 text-gray-900 bg-white transition-all"
                            value={address}
                            onChange={(e) => {
                                setAddress(e.target.value);
                                setError(null);
                            }}
                            placeholder="z.B. Berlin, Deutschland oder Hauptstraße 123, München"
                            autoComplete="off"
                            enterKeyHint="search"
                        />
                        {error && (
                            <p className="mt-2 text-sm text-red-600">{error}</p>
                        )}
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-2xl bg-gray-100 px-4 py-4 text-base font-bold text-gray-700 hover:bg-gray-200 active:scale-95 transition-all"
                        >
                            Abbrechen
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !address.trim()}
                            className="flex-[2] rounded-2xl bg-indigo-600 px-4 py-4 text-base font-bold text-white shadow-lg shadow-indigo-300 hover:bg-indigo-500 active:scale-95 transition-all disabled:opacity-70 disabled:scale-100"
                        >
                            {loading ? "Suche..." : "Suchen"}
                        </button>
                    </div>
                </form>
                </div>
            </div>
        </div>
    );
}


