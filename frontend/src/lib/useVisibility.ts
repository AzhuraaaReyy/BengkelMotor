// Shared visibility state to consolidate listeners across hooks
let visibilityCallbacks: ((visible: boolean) => void)[] = [];
let isVisible = document.visibilityState === "visible";

function onVisibilityChange() {
  isVisible = document.visibilityState === "visible";
  visibilityCallbacks.forEach((cb) => cb(isVisible));
}

// Initialize listener once
if (typeof document !== "undefined" && visibilityCallbacks.length === 0) {
  document.addEventListener("visibilitychange", onVisibilityChange);
}

export function useVisibility() {
  return {
    isVisible,
    subscribe: (callback: (visible: boolean) => void) => {
      visibilityCallbacks.push(callback);
      return () => {
        visibilityCallbacks = visibilityCallbacks.filter((c) => c !== callback);
      };
    },
  };
}