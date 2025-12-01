"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Camera, X } from "lucide-react";
import Toast from "@/components/Toast";
import { getAvatarUrl } from "@/lib/avatar";
import { compressImage } from "@/lib/imageCompression";

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const { data, error } = await supabase
          .from("users")
          .select("username, avatar_url")
          .eq("id", user.id)
          .single();

        if (data) {
          setUsername(data.username || "");
          // Check if avatar_url is a URL (starts with http)
          if (data.avatar_url && data.avatar_url.startsWith("http")) {
            setAvatarUrl(data.avatar_url);
          } else {
            setAvatarUrl(null);
          }
        }
      };
      fetchProfile();
    }
  }, [user]);

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const { error } = await supabase
      .from("users")
      .upsert({
        id: user.id,
        username,
        avatar_url: avatarUrl || "bg-indigo-600",
        updated_at: new Date().toISOString()
      });

    if (error) {
      setToast({ message: "Fehler beim Aktualisieren des Benutzernamens", type: "error" });
    } else {
      setToast({ message: "Profil erfolgreich aktualisiert!", type: "success" });
    }
    setLoading(false);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setToast({ message: "Bitte wählen Sie ein Bild aus", type: "error" });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setToast({ message: "Bild ist zu groß (max. 5MB)", type: "error" });
      return;
    }

    setUploading(true);

    try {
      // Compress image before upload
      const compressedFile = await compressImage(file, 400, 0.85); // 400px max, 85% quality for avatars

      console.log(`Original size: ${(file.size / 1024).toFixed(2)}KB, Compressed: ${(compressedFile.size / 1024).toFixed(2)}KB`);

      // Delete old avatar if exists
      if (avatarUrl && avatarUrl.includes('/storage/v1/object/public/pin-images/')) {
        const urlParts = avatarUrl.split('/storage/v1/object/public/pin-images/');
        if (urlParts.length > 1) {
          const oldPath = urlParts[1];
          await supabase.storage
            .from('pin-images')
            .remove([oldPath]);
        }
      }

      // Upload new avatar
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar_${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('pin-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true // Replace if exists
        });

      if (uploadError) {
        setToast({ message: `Bild konnte nicht hochgeladen werden: ${uploadError.message}`, type: "error" });
        setUploading(false);
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('pin-images')
        .getPublicUrl(filePath);

      const imageUrl = urlData.publicUrl;

      // Update user profile
      const { error: updateError } = await supabase
        .from("users")
        .update({ avatar_url: imageUrl, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      if (updateError) {
        setToast({ message: "Fehler beim Aktualisieren des Profilbilds", type: "error" });
      } else {
        setAvatarUrl(imageUrl);
        setToast({ message: "Profilbild erfolgreich hochgeladen!", type: "success" });
      }
    } catch (error: any) {
      setToast({ message: `Fehler: ${error.message}`, type: "error" });
    }

    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user || !avatarUrl) return;

    setUploading(true);

    try {
      // Delete from storage
      if (avatarUrl.includes('/storage/v1/object/public/pin-images/')) {
        const urlParts = avatarUrl.split('/storage/v1/object/public/pin-images/');
        if (urlParts.length > 1) {
          const oldPath = urlParts[1];
          await supabase.storage
            .from('pin-images')
            .remove([oldPath]);
        }
      }

      // Update user profile to use default color instead
      const { error } = await supabase
        .from("users")
        .update({ avatar_url: "bg-indigo-600", updated_at: new Date().toISOString() })
        .eq("id", user.id);

      if (error) {
        setToast({ message: "Fehler beim Entfernen des Profilbilds", type: "error" });
      } else {
        setAvatarUrl(null);
        setToast({ message: "Profilbild entfernt!", type: "success" });
      }
    } catch (error: any) {
      setToast({ message: `Fehler: ${error.message}`, type: "error" });
    }

    setUploading(false);
  };

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-gray-900 text-center">Profil</h1>

        {/* Profile Avatar with Image Upload */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            {avatarUrl ? (
              <div className="relative h-32 w-32 rounded-full overflow-hidden shadow-lg border-4 border-white">
                <img
                  src={getAvatarUrl(avatarUrl) || ''}
                  alt="Profilbild"
                  className="w-full h-full object-cover"
                  key={avatarUrl}
                />
                <button
                  onClick={handleRemoveAvatar}
                  disabled={uploading}
                  className="absolute top-1 right-1 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                  title="Bild entfernen"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="h-32 w-32 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg">
                <span className="text-5xl font-bold text-white">
                  {username ? username[0].toUpperCase() : user.email?.[0].toUpperCase()}
                </span>
              </div>
            )}
            <div className="absolute -bottom-1 -right-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-white text-gray-700 p-2.5 rounded-full shadow-lg hover:bg-gray-100 border-2 border-gray-200 disabled:opacity-50"
                title="Profilbild hochladen"
              >
                <Camera className="h-5 w-5" />
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>
          {uploading && (
            <p className="text-sm text-gray-600">Bild wird hochgeladen...</p>
          )}
        </div>

        {/* Username */}
        <form onSubmit={handleUpdateUsername} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-900 text-center">
              Benutzername
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 text-gray-900 text-center"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-70"
          >
            {loading ? "Speichern..." : "Speichern"}
          </button>
        </form>

        {/* Logout */}
        <div className="border-t pt-6">
          <button
            onClick={handleLogout}
            className="flex w-full justify-center rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 shadow-sm hover:bg-red-100"
          >
            Abmelden
          </button>
        </div>
      </div>

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
