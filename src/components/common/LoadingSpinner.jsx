function LoadingSpinner({ size = "medium", label = "Loading" }) {
  return (
    <span
      className={`loading-spinner-small loading-spinner-${size}`}
      role="status"
      aria-label={label}
    >
      <span />
    </span>
  );
}

export default LoadingSpinner;
