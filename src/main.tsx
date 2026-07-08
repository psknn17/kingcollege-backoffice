
  import { createRoot } from "react-dom/client";
  import { BrowserRouter } from "react-router-dom";
  import App from "./App.tsx";
  import { LanguageProvider } from "./contexts/LanguageContext.tsx";
  import { AcademicYearProvider } from "./contexts/AcademicYearContext.tsx";
  import { AuthProvider } from "./contexts/AuthContext.tsx";
  import { StudentProvider } from "./contexts/StudentContext.tsx";
  import { DiscountOptionsProvider } from "./contexts/DiscountOptionsContext.tsx";
  import { DevInvoiceSeeder } from "./components/DevInvoiceSeeder";
  import { TooltipProvider } from "./components/ui/tooltip.tsx";
  import { Agentation } from "agentation";
  import "./index.css";
  import { seedAllData } from "./utils/seedData";

  // Seed mock data on startup (only fills empty keys)
  seedAllData();

  createRoot(document.getElementById("root")!).render(
    <BrowserRouter>
      <TooltipProvider>
        <LanguageProvider>
          <AuthProvider>
            <AcademicYearProvider>
              <DiscountOptionsProvider>
                <StudentProvider>
                  {import.meta.env.DEV && <DevInvoiceSeeder />}
                  <App />
                  {import.meta.env.DEV && <Agentation />}
                </StudentProvider>
              </DiscountOptionsProvider>
            </AcademicYearProvider>
          </AuthProvider>
        </LanguageProvider>
      </TooltipProvider>
    </BrowserRouter>
  );
