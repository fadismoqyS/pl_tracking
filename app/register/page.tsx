"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RegisterPage() {
    const router = useRouter();

    // Automatisch zur Login-Seite weiterleiten
    useEffect(() => {
        const timer = setTimeout(() => {
            router.push("/login");
        }, 3000);
        return () => clearTimeout(timer);
    }, [router]);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-lg">
                <div className="text-center">
                    <img src="/manLOgo.jpeg" alt="PL Tracking" className="mx-auto h-24 w-24 rounded-2xl mb-4 object-contain" />
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                        Registrierung nicht verfügbar
                    </h2>
                    <div className="mt-6 space-y-4">
                        <p className="text-gray-600">
                            Die Registrierung ist nur über den Administrator möglich.
                        </p>
                        <p className="text-sm text-gray-500">
                            Neue Konten können nur von autorisierten Personen erstellt werden.
                        </p>
                        <p className="text-sm text-gray-500">
                            Kontaktieren Sie den Administrator, um ein Konto zu erhalten.
                        </p>
                    </div>
                </div>
                <div className="mt-8">
                    <Link
                        href="/login"
                        className="group relative flex w-full justify-center rounded-lg bg-indigo-600 px-3 py-3 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        >
                        Zur Anmeldung
                    </Link>
                    </div>
                <div className="text-center text-sm">
                    <p className="text-gray-500">
                        Sie werden automatisch zur Login-Seite weitergeleitet...
                    </p>
                </div>
            </div>
        </div>
    );
}
