import { useState } from "react";
import { Routes, Route } from "react-router-dom";

import SplashScreen from "./components/common/SplashScreen";

import AppLayout from "./components/layout/AppLayout";

import DashboardPage from "./pages/Dashboard/DashboardPage";

import LeadsPage from "./pages/Leads/LeadsPage";
import LeadWorkflowPage from "./pages/Leads/LeadWorkflowPage";

import CustomersPage from "./pages/Customers/CustomersPage";
import CustomerWorkflowPage from "./pages/Customers/CustomerWorkflowPage";

import ServicesPage from "./pages/Services/ServicesPage";

function App() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />

        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/leads/new" element={<LeadWorkflowPage />} />
        <Route path="/leads/:id/edit" element={<LeadWorkflowPage />} />

        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/customers/new" element={<CustomerWorkflowPage />} />
        <Route path="/customers/:id/edit" element={<CustomerWorkflowPage />} />

        <Route path="/services" element={<ServicesPage />} />
      </Route>
    </Routes>
  );
}

export default App;
