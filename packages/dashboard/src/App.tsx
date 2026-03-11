import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout.tsx";
import { Dashboard } from "./pages/Dashboard.tsx";
import { PayBox } from "./pages/PayBox.tsx";
import { Analytics } from "./pages/Analytics.tsx";
import { useFinanceData } from "./hooks/useFinanceData.ts";

export default function App() {
  const state = useFinanceData();

  return (
    <BrowserRouter>
      <Layout onRefresh={state.refresh} lastUpdated={state.lastUpdated} loading={state.loading}>
        <Routes>
          <Route path="/" element={<Dashboard state={state} />} />
          <Route path="/paybox" element={<PayBox state={state} />} />
          <Route path="/analytics" element={<Analytics state={state} />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
