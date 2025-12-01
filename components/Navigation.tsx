"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, User, MapPin } from "lucide-react";
import clsx from "clsx";

export default function Navigation() {
    const pathname = usePathname();

    // Remove trailing slash for comparison (Capacitor static export adds them)
    const normalizedPath = pathname?.replace(/\/$/, '') || '';

    // Don't show nav on login/register pages
    if (normalizedPath === "/login" || normalizedPath === "/register" || normalizedPath === "") return null;

    const links = [
        { name: "Karte", href: "/map", icon: Map },
        { name: "Meine PLs", href: "/my-pins", icon: MapPin },
        { name: "Profil", href: "/profile", icon: User },
    ];

    return (
        <>
            {/* Mobile Bottom Nav */}
            <div className="fixed bottom-0 left-0 right-0 z-[1000] bg-white border-t flex justify-around p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:hidden shadow-lg">
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = normalizedPath === link.href;
                    return (
                        <Link
                            key={link.name}
                            href={link.href}
                            className={clsx(
                                "flex flex-col items-center space-y-1 px-4 py-2 rounded-xl transition-all",
                                isActive
                                    ? "text-indigo-600 bg-indigo-50"
                                    : "text-gray-500 hover:text-indigo-500 hover:bg-gray-50"
                            )}
                        >
                            <Icon className={clsx("h-6 w-6", isActive && "stroke-[2.5px]")} />
                            <span className={clsx("text-xs", isActive ? "font-bold" : "font-medium")}>{link.name}</span>
                        </Link>
                    );
                })}
            </div>

            {/* Desktop Sidebar/Top Nav Overlay */}
            <div className="hidden md:flex fixed top-4 left-4 z-[1000] flex-col gap-2">
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">

                </div>
                <div className="bg-white rounded-xl shadow-lg p-2 flex flex-col gap-2">
                    {links.map((link) => {
                        const Icon = link.icon;
                        const isActive = normalizedPath === link.href;
                        return (
                            <Link
                                key={link.name}
                                href={link.href}
                                className={clsx(
                                    "p-3 rounded-lg transition-all flex items-center gap-3",
                                    isActive
                                        ? "bg-indigo-600 text-white shadow-md"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-indigo-500"
                                )}
                                title={link.name}
                            >
                                <Icon className={clsx("h-6 w-6", isActive && "stroke-[2.5px]")} />
                                {/* <span className="font-medium">{link.name}</span> */}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
