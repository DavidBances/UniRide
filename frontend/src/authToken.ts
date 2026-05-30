export const AUTH_TOKEN_KEY = "uniride-auth-token";
const AUTH_TOKEN_CHANGED_EVENT = "uniride-auth-token-changed";

export function getStoredToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(AUTH_TOKEN_KEY) ?? "";
}

export function clearStoredToken() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.dispatchEvent(new Event(AUTH_TOKEN_CHANGED_EVENT));
}

export function storeToken(token: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  window.dispatchEvent(new Event(AUTH_TOKEN_CHANGED_EVENT));
}

export function onAuthTokenChanged(listener: EventListener) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, listener);
  window.addEventListener("storage", listener);

  return () => {
    window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}
