import { useEffect } from "react";
import splashImage from "../assets/splash.jpg";

const SPLASH_DURATION_MS = 2000;

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="splash-screen">
      <img className="splash-image" src={splashImage} alt="ASSA 창원근로자합창단" />
    </div>
  );
}
