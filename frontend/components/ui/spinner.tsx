"use client";

interface KineticSpinnerProps {
  fullScreen?: boolean;
  accentPink?: string;
  accentWhite?: string;
  size?: "default" | "sm";
  className?: string;
}

function Spinner({
  fullScreen = false,
  accentPink = "#00AEBB",
  accentWhite = "#e2e7ee",
  size = "default",
  className = "",
}: KineticSpinnerProps) {
  return (
    <div
      className={`spinner-container ${size} ${fullScreen ? "fullscreen" : ""} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <div className="kinetic" />

      <style jsx>{`
        .spinner-container {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .spinner-container.fullscreen {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.8);
          z-index: 9999;
        }

        .kinetic {
          position: relative;
          height: 50px;
          width: 50px;
        }

        .spinner-container.sm .kinetic {
          height: 24px;
          width: 24px;
        }

        .kinetic::after,
        .kinetic::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 0;
          height: 0;
          border: 20px solid transparent;
          border-bottom-color: ${accentPink};
          border-radius: 50%;
          animation: rotateA 2s ease-in-out infinite 0.5s,
            color-change 2s ease-in-out infinite 1s;
        }

        .spinner-container.sm .kinetic::after,
        .spinner-container.sm .kinetic::before {
          border-width: 10px;
        }

        .kinetic::before {
          transform: rotate(90deg);
          animation: rotateB 2s ease-in-out infinite;
        }

        @keyframes rotateA {
          0%,
          25% {
            transform: rotate(0deg);
          }
          50%,
          75% {
            transform: rotate(180deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes rotateB {
          0%,
          25% {
            transform: rotate(90deg);
          }
          50%,
          75% {
            transform: rotate(270deg);
          }
          100% {
            transform: rotate(450deg);
          }
        }

        @keyframes color-change {
          0%,
          100% {
            border-bottom-color: ${accentPink};
          }
          50% {
            border-bottom-color: ${accentWhite};
          }
        }
      `}</style>
    </div>
  );
}

export { Spinner };
