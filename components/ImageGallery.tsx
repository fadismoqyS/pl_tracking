"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { ArrowLeft } from "lucide-react";
import clsx from "clsx";

type ImageGalleryProps = {
    isOpen: boolean;
    onClose: () => void;
    images: string[];
    initialIndex?: number;
};

export default function ImageGallery({ isOpen, onClose, images, initialIndex = 0 }: ImageGalleryProps) {
    if (!images || images.length === 0) return null;

    return (
        <div 
            className={clsx(
                "fixed inset-0 z-[2000] ios-modal-container flex flex-col bg-black",
                isOpen ? "ios-modal-open" : "ios-modal-closed"
            )}
        >
            {/* Native iOS-style header */}
            <div className="bg-black/80 backdrop-blur-sm border-b border-gray-800 pt-safe pb-3 px-4 flex items-center gap-3 flex-shrink-0">
                        <button
                            onClick={onClose}
                    className="flex items-center justify-center w-10 h-10 -ml-2 active:opacity-50 transition-opacity"
                    aria-label="Zurück"
                        >
                    <ArrowLeft className="w-6 h-6 text-white" />
                        </button>
                <div className="flex items-center gap-2 flex-1">
                    <h2 className="text-xl font-semibold text-white">Bilder</h2>
                </div>
                <div className="w-10" /> {/* Spacer for centering */}
            </div>

            <div className="bg-black flex flex-col flex-1 overflow-hidden min-h-0 relative">

                        <Swiper
                            modules={[Pagination]}
                            pagination={{ clickable: true }}
                            initialSlide={initialIndex}
                            className="h-full w-full"
                            spaceBetween={20}
                        >
                            {images.map((img, idx) => (
                                <SwiperSlide key={idx} className="flex items-center justify-center h-full">
                            <div className="relative w-full h-full flex items-center justify-center p-4">
                                        <img
                                            src={img}
                                            alt={`Gallery image ${idx + 1}`}
                                            className="max-w-full max-h-full object-contain rounded-lg"
                                        />
                                    </div>
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    </div>
        </div>
    );
}
