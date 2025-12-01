"use client";

import dynamic from "next/dynamic";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Dynamically import Map component to avoid window is not defined error
const Map = dynamic(() => import("@/components/Map"), {
    ssr: false,
    loading: () => (
        <div className="flex h-screen items-center justify-center bg-gray-100">
            <div className="text-xl font-semibold text-gray-600">Karte wird geladen...</div>
        </div>
    ),
});

export default function MapPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-100">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="h-screen w-full">
            <Map />
        </div>
    );
}
