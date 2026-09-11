import { useEffect, useState } from "react";

function SplashScreen({ onComplete, duration = 1800 }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setExiting(true);
    }, duration - 350);

    const completeTimer = setTimeout(() => {
      onComplete?.();
    }, duration);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [duration, onComplete]);

  return (
    <div
      className={`splash-screen ${exiting ? "splash-screen-exiting" : ""}`}
      aria-label="Loading OmniCore"
    >
      <div className="splash-content">
        <div className="splash-logo">
          <span>OC</span>
        </div>

        <div className="splash-brand">
          <h1>OmniCore</h1>
          <p>Customer Platform</p>
        </div>

        <div className="splash-loader" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <p className="splash-status">Initializing platform</p>
      </div>
    </div>
  );
}

export default SplashScreen;
