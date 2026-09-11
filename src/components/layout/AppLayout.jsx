import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

function AppLayout() {
  return (
    <div className="app">
      <Sidebar />

      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;