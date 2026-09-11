function EmptyState({ message = "No records found." }) {
  return <div className="empty">{message}</div>;
}

export default EmptyState;
