"use client";

interface KineticSpinnerProps {
  fullScreen?: boolean;
  accentPink?: string;
  accentWhite?: string;
}

function Spinner({
  fullScreen = false,
  accentPink = "#00AEBB",
  accentWhite = "#e2e7ee",
}: KineticSpinnerProps) {
  return (
    <div className={`spinner-container ${fullScreen ? "fullscreen" : ""}`} role="status" aria-label="Loading">
      <div className="kinetic" />

      <style jsx>{`
        .spinner-container {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .fullscreen {
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          margin: 0;
        }

        .kinetic {
          position: relative;
          height: 40px;
          width: 40px;
        }

        .kinetic::before,
        .kinetic::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 0;
          height: 0;
          border: 20px solid transparent;
          border-bottom-color: ${accentPink};
          animation: rotateA 2s ease-in-out infinite 0.5s,
            color-change 2s ease-in-out infinite 1s;
        }

        .kinetic::before {
          animation: rotateB 2s ease-in-out infinite,
            color-change 2s ease-in-out infinite;
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
          75% {
            border-bottom-color: ${accentWhite};
          }
        }
      `}</style>
    </div>
  );
}

export { Spinner }