import React from "react";
import ReactDOM from "react-dom/client";
import { Router } from "./router";
import { AppProviders } from "./router/AppProviders";
import "@/style/global.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppProviders>
      <Router />
    </AppProviders>
  </React.StrictMode>
);
