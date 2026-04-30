import { Route, Routes } from "react-router-dom";
import { LoginPage } from "../features/auth/LoginPage";
import { RegisterPage } from "../features/auth/RegisterPage";
import { EditorPage } from "../features/editor/EditorPage";
import { App } from "./App";
import { ProtectedRoute } from "./routes/ProtectedRoute";

export function Router() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/diagrams/:diagramId" element={<EditorPage />} />
        <Route path="/*" element={<App />} />
      </Route>
    </Routes>
  );
}
