"use client";
import { useLanguage } from "@/contexts/language-context";

import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { updateProfile, updatePassword } from "firebase/auth";
import Image from "next/image";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Eye, EyeOff } from "lucide-react";

export default function ProfilePage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [image, setImage] = useState<string>("/default-avatar.png");
  const [displayImage, setDisplayImage] = useState<string>("/default-avatar.png");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [urlError, setUrlError] = useState("");
  const [uploading, setUploading] = useState(false);

  const currentProviderId = user?.providerData[0]?.providerId || null;

  useEffect(() => {
    if (user) {
      setName(user.displayName || "");
      // Prioritize user.photoURL if it exists and is a valid URL/path
      if (
        user.photoURL &&
        typeof user.photoURL === "string" &&
        (user.photoURL.startsWith("http") || user.photoURL.startsWith("/") || user.photoURL.startsWith("data:image/"))
      ) {
        setImage(user.photoURL);
        setDisplayImage(user.photoURL);
      } else {
        setImage("/default-avatar.png");
        setDisplayImage("/default-avatar.png"); // Fallback if photoURL is invalid or missing
      }
      // For email/password users, try to load image from Firestore if available
      if (currentProviderId === "password") {
        getDoc(doc(db, "users", user.uid)).then((docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (
              data.image &&
              typeof data.image === "string" &&
              (data.image.startsWith("http") || data.image.startsWith("/"))
            ) {
              setImage(data.image);
            }
          }
        });
      }
    }
  }, [user, currentProviderId]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) {
      setError(t("no_file_selected_or_user_not_authenticated"));
      return;
    }

    setUploading(true);
    setError("");
    try {
      const storage = getStorage();
      const storageRef = ref(storage, `users/${user.uid}/profile.jpg`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setImage(url);
      setDisplayImage(url);
      setSuccess(
        t(
          "image_uploaded_successfully_click_save_changes_to_update_your_profile",
        ),
      );
    } catch (err: any) {
      console.error(t("error_uploading_image"), err);
      setError(err.message || t("failed_to_upload_image"));
    } finally {
      setUploading(false);
    }
  };

  const validateUrl = (url: string): boolean => {
    try {
      // Basic URL validation
      if (!url) return true; // Allow empty URL (will use default)
      
      // Check if it's a data URL
      if (url.startsWith('data:image/')) {
        return true;
      }
      
      // Check if it's a relative path
      if (url.startsWith('/')) {
        return true;
      }
      
      // Check if it's a valid URL
      new URL(url);
      return url.match(/\.(jpeg|jpg|gif|png|svg|webp)$/) !== null;
    } catch (e) {
      return false;
    }
  };

  const handleImageUrlChange = (url: string) => {
    setImage(url);
    if (url && !validateUrl(url)) {
      setUrlError(t("invalid_image_url_format"));
      // Keep the previous valid image if the new one is invalid
      setDisplayImage(prev => prev || "/default-avatar.png");
    } else {
      setUrlError("");
      setDisplayImage(url || "/default-avatar.png");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate URL before saving
    if (image && !validateUrl(image)) {
      setUrlError(t("invalid_image_url_format"));
      return;
    }
    
    setLoading(true);
    setError("");
    setSuccess("");
    setUrlError("");
    try {
      if (!user) throw new Error(t("not_authenticated"));

      // Update Firebase Auth profile
      await updateProfile(user, { displayName: name, photoURL: image }); // user is now FirebaseUser

      // Update Firestore image if provider is password
      if (currentProviderId === "password") {
        await setDoc(doc(db, "users", user.uid), { image }, { merge: true });
      }

      // Update password if provided
      if (currentProviderId === "password" && password) {
        await updatePassword(user, password); // user is now FirebaseUser
      }

      setSuccess(t("profile_updated_successfully"));
    } catch (err: any) {
      setError(err.message || t("failed_to_update_profile"));
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="p-8">{t("not_logged_in")}</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background" data-testid="profile-page">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6 text-center text-primary" data-testid="profile-title">
          {t("user_profile")}
        </h2>
        <div className="flex flex-col items-center mb-6">
          <div data-testid="profile-image-container">
            <div className="w-24 h-24 rounded-full border-4 border-primary overflow-hidden mb-2">
              <Image
                src={displayImage}
                alt="Profile"
                width={96}
                height={96}
                className="w-full h-full object-cover"
                loader={({ src }) => src}
                data-testid="profile-image"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/default-avatar.png';
                }}
              />
            </div>
          </div>
          <span className="text-lg font-semibold text-foreground" data-testid="profile-name">
            {name || t("no_name")}
          </span>
          <span className="text-sm text-muted-foreground" data-testid="profile-email">
            {user.email}
          </span>
        </div>
        <form onSubmit={handleSave} className="space-y-4" data-testid="profile-form">
          <div>
            <label className="block font-medium mb-1 text-foreground" data-testid="name-label">
              Name
            </label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2 bg-background text-foreground"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={currentProviderId === "google.com"}
              data-testid="name-input"
            />
          </div>
          {currentProviderId === "password" && (
            <div>
              <label className="block font-medium mb-1 text-foreground" data-testid="image-upload-label">
                {t("upload_profile_image")}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="w-full"
                data-testid="image-upload-input"
              />
              {uploading && (
                <div className="text-sm text-muted-foreground" data-testid="uploading-message">
                  {t("uploading")}
                </div>
              )}
            </div>
          )}
          <div>
            <label className="block font-medium mb-1 text-foreground" data-testid="image-url-label">
              {t("profile_image_url")}
            </label>
            <input
              type="text"
              value={image}
              onChange={(e) => handleImageUrlChange(e.target.value)}
              disabled={currentProviderId === "google.com"}
              data-testid="image-url-input"
              className={`w-full border rounded px-3 py-2 bg-background text-foreground ${
                urlError ? 'border-red-500' : ''
              }`}
            />
            {urlError && (
              <p className="mt-1 text-sm text-red-500" data-testid="url-error-message">
                {urlError}
              </p>
            )}
          </div>
          {currentProviderId === "password" && (
            <div>
              <label className="block font-medium mb-1 text-foreground" data-testid="password-label">
                {t("new_password")}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full border rounded px-3 py-2 bg-background text-foreground pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave blank to keep current password"
                  data-testid="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  data-testid="password-toggle-button"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-2 px-4 rounded hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            data-testid="save-button"
          >
            {loading ? t("saving") : t("save_changes")}
          </button>
          
          {error && (
            <div className="text-red-500 text-sm mt-2" data-testid="error-message">
              {error}
            </div>
          )}
          {success && (
            <div className="text-green-500 text-sm mt-2" data-testid="success-message">
              {success}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
