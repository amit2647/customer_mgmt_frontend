import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <div className="empty">
      <h2>404</h2>

      <p>Page not found.</p>

      <Link to="/leads">Go to Leads</Link>
    </div>
  );
}

export default NotFoundPage;
