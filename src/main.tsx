
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import { LanguageProvider } from "./contexts/LanguageContext.tsx";
  import { AcademicYearProvider } from "./contexts/AcademicYearContext.tsx";
  import { AuthProvider } from "./contexts/AuthContext.tsx";
  import { StudentProvider } from "./contexts/StudentContext.tsx";
  import { DiscountOptionsProvider } from "./contexts/DiscountOptionsContext.tsx";
  import { TooltipProvider } from "./components/ui/tooltip.tsx";
  import "./index.css";

  createRoot(document.getElementById("root")!).render(
    <TooltipProvider>
      <LanguageProvider>
        <AuthProvider>
          <AcademicYearProvider>
            <DiscountOptionsProvider>
              <StudentProvider>
                <App />
              </StudentProvider>
            </DiscountOptionsProvider>
          </AcademicYearProvider>
        </AuthProvider>
      </LanguageProvider>
    </TooltipProvider>
  );
