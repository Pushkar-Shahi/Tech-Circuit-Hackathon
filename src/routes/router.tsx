import { lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/components/shell/AppShell";
import { NotFound } from "./NotFound";

// Lazy-loaded VeriBrand AI route components
const Dashboard = lazy(() => import("@/features/dashboard/DashboardPage"));
const LandingPage = lazy(() => import("@/features/landing/LandingPage"));
const CampaignsList = lazy(() => import("@/features/campaigns/CampaignsListPage"));
const NewCampaignWizard = lazy(() => import("@/features/campaigns/NewCampaignWizard"));
const ReviewWorkspace = lazy(() => import("@/features/copilot/ReviewWorkspacePage"));
const ManagerQueue = lazy(() => import("@/features/queue/ManagerQueuePage"));
const BrandBrain = lazy(() => import("@/features/brain/BrandBrainPage"));
const BrandsPage = lazy(() => import("@/features/brands/BrandsPage"));
const GovernanceAnalytics = lazy(() => import("@/features/analytics/GovernanceAnalyticsPage"));
const GovernanceAudit = lazy(() => import("@/features/audit/GovernanceAuditPage"));
const Settings = lazy(() => import("@/features/settings/SettingsPage"));

export const router = createBrowserRouter(
  [
    // Standalone Landing Page (public showcase)
    {
      path: "/landing",
      element: <LandingPage />,
    },
    // Core Application Shell routes
    {
      element: <AppShell />,
      children: [
        { path: "/", element: <Dashboard /> },
        { path: "/campaigns", element: <CampaignsList /> },
        { path: "/campaigns/new", element: <NewCampaignWizard /> },
        { path: "/campaigns/:campaignId", element: <ReviewWorkspace /> },
        { path: "/queue", element: <ManagerQueue /> },
        { path: "/brain", element: <BrandBrain /> },
        { path: "/brands", element: <BrandsPage /> },
        { path: "/analytics", element: <GovernanceAnalytics /> },
        { path: "/audit", element: <GovernanceAudit /> },
        { path: "/settings", element: <Settings /> },

        // Aliases for legacy navigation
        { path: "/runs", element: <Navigate to="/campaigns" replace /> },
        { path: "/runs/new", element: <Navigate to="/campaigns/new" replace /> },
        { path: "/runs/:runId", element: <Navigate to="/campaigns" replace /> },
        { path: "/review", element: <Navigate to="/queue" replace /> },
        { path: "/rules", element: <Navigate to="/brain" replace /> },
        { path: "/reports", element: <Navigate to="/analytics" replace /> },

        // 404
        { path: "*", element: <NotFound /> },
      ],
    },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true,
    },
  }
);
