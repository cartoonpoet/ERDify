import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./routes/ProtectedRoute";

const LoginPage = lazy(() => import("../features/auth/pages/LoginPage").then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("../features/auth/pages/RegisterPage").then(m => ({ default: m.RegisterPage })));
const EditorPage = lazy(() => import("../features/editor/pages/EditorPage").then(m => ({ default: m.EditorPage })));
const DashboardPage = lazy(() => import("../features/dashboard/pages/DashboardPage").then(m => ({ default: m.DashboardPage })));
const SharedDiagramPage = lazy(() => import("../features/shared-diagram/pages/SharedDiagramPage").then(m => ({ default: m.SharedDiagramPage })));

export const Router = () => (
  <Suspense fallback={null}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/share/:shareToken" element={<SharedDiagramPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/diagrams/:diagramId" element={<EditorPage />} />
        <Route path="/*" element={<DashboardPage />} />
      </Route>
    </Routes>
  </Suspense>
);
