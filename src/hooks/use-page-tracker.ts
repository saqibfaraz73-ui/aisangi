import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./use-auth";
import { supabase } from "@/integrations/supabase/client";

function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/Mobi|Android/i.test(ua)) return "mobile";
  if (/Tablet|iPad/i.test(ua)) return "tablet";
  return "desktop";
}

function getBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Safari")) return "Safari";
  if (ua.includes("Opera") || ua.includes("OPR")) return "Opera";
  return "Other";
}

function getOS(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac OS")) return "macOS";
  if (ua.includes("Linux")) return "Linux";
  if (ua.includes("Android")) return "Android";
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  return "Other";
}

function getSessionId(): string {
  let id = sessionStorage.getItem("visit_session_id");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("visit_session_id", id);
  }
  return id;
}

export function usePageTracker() {
  const location = useLocation();
  const { user } = useAuth();
  const lastPath = useRef("");

  useEffect(() => {
    const path = location.pathname;
    // Don't track the same page twice in a row
    if (path === lastPath.current) return;
    lastPath.current = path;

    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    fetch(`https://${projectId}.supabase.co/functions/v1/track-visit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": anonKey,
      },
      body: JSON.stringify({
        page_path: path,
        device_type: getDeviceType(),
        browser: getBrowser(),
        os: getOS(),
        session_id: getSessionId(),
        user_id: user?.id || null,
      }),
    }).catch(() => {
      // Silent fail - don't break app for analytics
    });
  }, [location.pathname, user?.id]);
}
