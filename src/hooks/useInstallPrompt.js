import { useEffect, useState } from 'react';

/** @typedef {{ prompt: () => Promise<void>, userChoice: Promise<{outcome:'accepted'|'dismissed'}> }} BeforeInstallPromptEvent */

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  useEffect(() => {
    const onBeforeInstallPrompt = (e) => {
      // Гасим системный чип «Установить приложение», чтобы показывать только
      // свой пункт в меню темы, а не дублировать нативный UI.
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onAppInstalled = () => setDeferredPrompt(null);
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null); // событие одноразовое, повторно не использовать
  };

  return { canInstall: !!deferredPrompt, promptInstall };
}