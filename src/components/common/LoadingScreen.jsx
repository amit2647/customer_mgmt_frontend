function LoadingScreen({ message = "Loading platform", fullScreen = true }) {
  return (
    <div
      className={`loading-screen ${
        fullScreen ? "loading-screen-full" : "loading-screen-inline"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="loading-content">
        <div className="loading-logo">
          <span>OC</span>
        </div>

        <div className="loading-spinner" aria-hidden="true">
          <span />
        </div>

        <p className="loading-message">{message}</p>

        <div className="loading-progress" aria-hidden="true">
          <span />
        </div>
      </div>
    </div>
  );
}

export default LoadingScreen;
