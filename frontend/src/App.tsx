import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Shell from "./components/layout/Shell";
import Dashboard from "./pages/Dashboard";
import ItemsTracker from "./pages/ItemsTracker";
import Cases from "./pages/Cases";
import Deals from "./pages/Deals";
import Groups from "./pages/Groups";
import ScenarioBuilder from "./pages/ScenarioBuilder";
import ScenarioDetail from "./pages/ScenarioDetail";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Shell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="items" element={<ItemsTracker />} />
          <Route path="cases" element={<Cases />} />
          <Route path="deals" element={<Deals />} />
          <Route path="groups" element={<Groups />} />
          <Route path="scenarios" element={<ScenarioBuilder />} />
          <Route path="scenarios/:filename" element={<ScenarioDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
