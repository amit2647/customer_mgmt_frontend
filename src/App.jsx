import { Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "./components/layout/AppLayout";

import LeadsPage from "./pages/Leads/LeadsPage";
import CustomersPage from "./pages/Customers/CustomersPage";
import ServicesPage from "./pages/Services/ServicesPage";
import NotFoundPage from "./pages/NotFound/NotFoundPage";
import DashboardPage from "./pages/Dashboard/DashboardPage";

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* Dashboard is now the application home page */}
        <Route path="/" element={<DashboardPage />} />

        <Route path="/dashboard" element={<DashboardPage />} />

        <Route path="/leads" element={<LeadsPage />} />

        <Route path="/customers" element={<CustomersPage />} />

        <Route path="/services" element={<ServicesPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
