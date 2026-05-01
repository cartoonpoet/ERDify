import { Route, Routes } from "react-router-dom";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { RegisterPage } from "../features/auth/pages/RegisterPage";
import { EditorPage } from "../features/editor/pages/EditorPage";
import { DashboardPage } from "../features/dashboard/pages/DashboardPage";
import { SharedDiagramPage } from "../features/shared-diagram/pages/SharedDiagramPage";
import { ProtectedRoute } from "./routes/ProtectedRoute";

export const Router = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/share/:shareToken" element={<SharedDiagramPage />} />
    <Route element={<ProtectedRoute />}>
      <Route path="/diagrams/:diagramId" element={<EditorPage />} />
      <Route path="/*" element={<DashboardPage />} />
    </Route>
  </Routes>
);
