
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import { LanguageProvider } from "./contexts/LanguageContext.tsx";
  import { AcademicYearProvider } from "./contexts/AcademicYearContext.tsx";
  import "./index.css";

  createRoot(document.getElementById("root")!).render(
    <LanguageProvider>
      <AcademicYearProvider>
        <App />
      </AcademicYearProvider>
    </LanguageProvider>
  );
