import { Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "./components/layout/AppLayout";

import LeadsPage from "./pages/Leads/LeadsPage";
import CustomersPage from "./pages/Customers/CustomersPage";
import ServicesPage from "./pages/Services/ServicesPage";
import NotFoundPage from "./pages/NotFound/NotFoundPage";

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/leads" replace />} />

        <Route path="/leads" element={<LeadsPage />} />

        <Route path="/customers" element={<CustomersPage />} />

        <Route path="/services" element={<ServicesPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
