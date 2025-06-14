"use client";

import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { updateProfile, updatePassword } from "firebase/auth";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  const { user } = useAuth();
  const [providerId, setProviderId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.displayName || "");
      setImage(user.photoURL || "");
      setProviderId(user.providerId || null);
      // For email/password users, try to load image from Firestore
      if (user.providerId === "password") {
        getDoc(doc(db, "users", user.uid)).then((docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.image) setImage(data.image);
          }
        });
      }
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      if (!user) throw new Error("Not authenticated");
      // Update Firebase Auth profile
      await updateProfile(user as any, { displayName: name });
      // Update Firestore image if provider is password
      if (providerId === "password") {
        await setDoc(doc(db, "users", user.uid), { image }, { merge: true });
      }
      // Update password if provided
      if (providerId === "password" && password) {
        await updatePassword(user as any, password);
      }
      setSuccess("Profile updated successfully.");
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="p-8">Not logged in.</div>;

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">User Profile</h2>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block font-medium">Name</label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={providerId === "google.com"}
          />
        </div>
        <div>
          <label className="block font-medium">Email</label>
          <input
            type="email"
            className="w-full border rounded px-3 py-2 bg-gray-100"
            value={user.email || ""}
            disabled
          />
        </div>
        <div>
          <label className="block font-medium">Profile Image URL</label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2"
            value={image}
            onChange={e => setImage(e.target.value)}
            disabled={providerId === "google.com"}
          />
          {image && (
            <img src={image} alt="Profile" className="w-20 h-20 rounded-full mt-2" />
          )}
        </div>
        {providerId === "password" && (
          <div>
            <label className="block font-medium">New Password</label>
            <input
              type="password"
              className="w-full border rounded px-3 py-2"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Leave blank to keep current password"
            />
          </div>
        )}
        {error && <div className="text-red-500 text-sm">{error}</div>}
        {success && <div className="text-green-600 text-sm">{success}</div>}
        <Button type="submit" disabled={loading || providerId === "google.com"}>
          {loading ? "Saving..." : providerId === "google.com" ? "View Only" : "Save Changes"}
        </Button>
      </form>
    </div>
  );
} 