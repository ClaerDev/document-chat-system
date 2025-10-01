import { useEffect, useState } from 'react';

export function useIsTouchDevice(): boolean {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouchDevice = () => {
      return 'ontouchstart' in window || 
             navigator.maxTouchPoints > 0 ||
             (navigator as any).msMaxTouchPoints > 0;
    };

    setIsTouchDevice(checkTouchDevice());

    // Listen for changes in case device capabilities change
    const handleResize = () => {
      setIsTouchDevice(checkTouchDevice());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isTouchDevice;
}