"use client";

import { useEffect, memo } from "react";
import { X, CheckCircle, AlertCircle } from "lucide-react";

type ToastProps = {
    message: string;
    type: "success" | "error" | "info";
    onClose: () => void;
    duration?: number;
};

function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const bgColor = type === "success" ? "bg-green-50" : type === "error" ? "bg-red-50" : "bg-blue-50";
    const textColor = type === "success" ? "text-green-800" : type === "error" ? "text-red-800" : "text-blue-800";
    const iconColor = type === "success" ? "text-green-600" : type === "error" ? "text-red-600" : "text-blue-600";

    return (
        <div className={`fixed top-4 right-4 z-[9999] max-w-sm w-full ${bgColor} rounded-lg shadow-lg p-4 flex items-start gap-3 animate-slide-in`}>
            <div className={iconColor}>
                {type === "success" ? (
                    <CheckCircle className="h-5 w-5" />
                ) : (
                    <AlertCircle className="h-5 w-5" />
                )}
            </div>
            <div className="flex-1">
                <p className={`text-sm font-medium ${textColor}`}>{message}</p>
            </div>
            <button
                onClick={onClose}
                className={`${textColor} hover:opacity-70 transition-opacity`}
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}

export default memo(Toast);
