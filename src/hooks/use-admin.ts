import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState } from "react";
import { fetchAndActivate, getString } from "firebase/remote-config";
import { remoteConfig } from "@/lib/firebase";

/**
 * Hook that returns whether the currently authenticated user should be
 * considered an application administrator.  The hook is intentionally
 * lightweight: it reads a couple of Remote Config flags and/or custom
 * claims on the Firebase user.  This gives you a single place to change
 * the "who is admin" logic.
 *
 * Remote Config keys expected:
 *   - `restrict_securities_to_admins` (boolean) - if `true`, the securities
 *      page & button will be hidden from non‑admins.  Defaults to `false`.
 *   - `admin_uids` (string) - comma separated list of user UIDs who are
 *      considered admins.
 *   - `admin_emails` (string) - comma separated list of email addresses that
 *      should also be treated as administrators.  Using emails makes testing
 *      easier because you don't need to look up a UID, but it is slightly less
 *      secure (emails can change) so we support both.
 *
 * The hook checks the `admin` custom claim first; if present it short‑circuits
 * and ignores remote config completely.  That lets you grant permanent
 * privileges via the Admin SDK while still keeping the UI toggleable.
 */
export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    if (!user) {
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }

    // check custom claim first
    user.getIdTokenResult().then((idTokenResult) => {
      if (idTokenResult.claims?.admin) {
        setIsAdmin(true);
        setIsLoading(false);
        return;
      }

      fetchAndActivate(remoteConfig)
        .then(() => {
          const rawEmails = getString(remoteConfig, "admin_emails");
          const emails = rawEmails
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean);

          setIsAdmin(
            user.email ? emails.includes(user.email.toLowerCase()) : false,
          );
        })
        .catch((err) => {
          console.error("remote config fetch failed", err);
          setIsAdmin(false);
        })
        .finally(() => {
          setIsLoading(false);
        });
    });
  }, [user]);

  return { isAdmin, isLoading };
}
