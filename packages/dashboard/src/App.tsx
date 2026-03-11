import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { HouseholdPage } from "./pages/HouseholdPage.tsx";
import { DanielPage } from "./pages/DanielPage.tsx";
import { ShellyPage } from "./pages/ShellyPage.tsx";
import { InvestmentsPage } from "./pages/InvestmentsPage.tsx";
import { PayBox } from "./pages/PayBox.tsx";
import { Analytics } from "./pages/Analytics.tsx";
import { useFinanceData } from "./hooks/useFinanceData.ts";

export default function App() {
  const state = useFinanceData();

  return (
    <BrowserRouter>
      <Layout onRefresh={state.refresh} lastUpdated={state.lastUpdated} loading={state.loading}>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<HouseholdPage state={state} />} />
            <Route path="/daniel" element={<DanielPage state={state} />} />
            <Route path="/shelly" element={<ShellyPage state={state} />} />
            <Route path="/investments" element={<InvestmentsPage state={state} />} />
            <Route path="/paybox" element={<PayBox state={state} />} />
            <Route path="/analytics" element={<Analytics state={state} />} />
          </Routes>
        </ErrorBoundary>
      </Layout>
    </BrowserRouter>
  );
}
