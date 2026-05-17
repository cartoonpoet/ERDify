import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { QueryErrorBoundary } from "@/shared/components/QueryErrorBoundary";

const LoginPage = lazy(() => import("@/features/auth/pages/LoginPage").then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("@/features/auth/pages/RegisterPage").then(m => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import("@/features/auth/pages/ForgotPasswordPage").then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import("@/features/auth/pages/ResetPasswordPage").then(m => ({ default: m.ResetPasswordPage })));
const EditorPage = lazy(() => import("@/features/editor/pages/EditorPage").then(m => ({ default: m.EditorPage })));
const DashboardPage = lazy(() => import("@/features/dashboard/pages/DashboardPage").then(m => ({ default: m.DashboardPage })));
const DiagramGrid = lazy(() => import("@/features/dashboard/components/DiagramGrid").then(m => ({ default: m.DiagramGrid })));
const MemberManagementPage = lazy(() => import("@/features/dashboard/pages/MemberManagementPage").then(m => ({ default: m.MemberManagementPage })));
const ApiKeysPanel = lazy(() => import("@/features/dashboard/pages/ApiKeysPanel").then(m => ({ default: m.ApiKeysPanel })));
const RootRedirect = lazy(() => import("@/pages/RootRedirect").then(m => ({ default: m.RootRedirect })));
const SharedDiagramPage = lazy(() => import("@/pages/SharedDiagramPage").then(m => ({ default: m.SharedDiagramPage })));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage").then(m => ({ default: m.NotFoundPage })));

export const Router = () => (
  <Suspense fallback={null}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/share/:shareToken"
        element={
          <QueryErrorBoundary variant="page" backLabel="홈으로 이동" backPath="/">
            <SharedDiagramPage />
          </QueryErrorBoundary>
        }
      />
      <Route element={<ProtectedRoute />}>
        <Route
          path="/diagrams/:diagramId"
          element={
            <QueryErrorBoundary variant="page" backLabel="대시보드로 이동" backPath="/">
              <EditorPage />
            </QueryErrorBoundary>
          }
        />
        <Route
          element={
            <QueryErrorBoundary variant="page">
              <DashboardPage />
            </QueryErrorBoundary>
          }
        >
          <Route path="/" element={<RootRedirect />} />
          <Route path="/:orgId">
            <Route index element={<DiagramGrid />} />
            <Route path="members" element={<MemberManagementPage />} />
            <Route path="api-keys" element={<ApiKeysPanel />} />
            <Route path=":projectId" element={<DiagramGrid />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </Suspense>
);
