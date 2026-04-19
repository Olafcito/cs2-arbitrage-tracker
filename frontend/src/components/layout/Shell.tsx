import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { CurrencyProvider } from "../../context/CurrencyContext";

export default function Shell() {
  return (
    <CurrencyProvider>
      <div className="flex min-h-screen bg-zinc-950">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <TopBar />
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </CurrencyProvider>
  );
}
