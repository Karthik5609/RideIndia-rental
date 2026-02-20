import { useEffect, useState } from "react";

export default function PwaInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setPromptEvent(event);
      setVisible(true);
    };

    const onAppInstalled = () => {
      setVisible(false);
      setPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!promptEvent) return;
    promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
    setVisible(false);
  };

  if (!visible || !promptEvent) return null;

  return (
    <div className="pwa-install glass-card">
      <p>Install Ride India app for quick access.</p>
      <div className="pwa-actions">
        <button type="button" className="btn-primary" onClick={install}>
          Install App
        </button>
        <button type="button" className="btn-outline" onClick={() => setVisible(false)}>
          Later
        </button>
      </div>
    </div>
  );
}
