import { useState, type ReactNode } from "react";
import { useSession } from "./app/session";

import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useParams,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  ActionButton,
  AppSidebar,
  EmptyState,
  Modal,
  roleNav,
  SelectField,
  Skeleton,
  StatusBadge,
  SurfaceCard,
  TextField,
} from "./components";
import { Notice, PageHeader } from "./components/client-shared";
import { ClientShell } from "./components/layout/ClientShell";
import { ClientGuard, SessionProvider } from "./app/session";
import { DirectoryPage } from "./features/marketplace/DirectoryPage";
import { LandingPage } from "./features/marketplace/LandingPage";
import { CompanyPage } from "./features/marketplace/pages";
import { AuthPage } from "./features/auth/AuthPage";
import { ChangePasswordPage, WorkspacePage } from "./features/auth/pages";
import {
  EmailVerificationPage,
  PasswordResetPage,
  PendingVerificationPage,
  ProviderOnboardingPage,
} from "./features/auth/AccountFlows";
import {
  ClientDashboardPage,
  LegacyClientRoute,
  RequestEntryRoute,
} from "./features/client/ClientDashboardPage";
import { SharedExamples } from "./features/client/SharedExamples";
import ManagerDashboard from "./features/manager/Dashboard";
import RequestInbox from "./features/manager/Requests";
import QuoteBuilder from "./features/manager/QuoteBuilder";
import ManagerJobs from "./features/manager/Jobs";
import ManagerSchedule from "./features/manager/Schedule";
import Invoices from "./features/manager/Invoices";
import ManagerTeam from "./features/manager/Team";
import PolicyPage from "./features/manager/PolicyPage";
import CompanyProfilePage from "./features/manager/CompanyProfile";
import EmployeeJobs from "./features/employee/Jobs";
import EmployeeJobDetail from "./features/employee/JobDetail";
import AdminCompanies from "./features/admin/Companies";
import AdminCatalog from "./features/admin/Catalog";
import "./styles/client.css";

type Role = "manager" | "employee" | "admin";

const EmployeeHome = () => <h1>EmployeeHome</h1>;

const EmployeeSchedule = () => <h1>EmployeeSchedule</h1>;
const AdminHome = () => <h1>AdminHome</h1>;

const AdminSettings = () => <h1>AdminSettings</h1>;

function Shell({ role, children }: { role: Role; children: ReactNode }) {
  const { user } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const items = roleNav[role];

  const activeHref = items.reduce<string>((current, item) => {
    const isExactMatch = location.pathname === item.href;
    const isNestedMatch = item.href !== "/" && location.pathname.startsWith(`${item.href}/`);
    if (isExactMatch || isNestedMatch) {
      return item.href.length > current.length ? item.href : current;
    }
    return current;
  }, items[0]?.href ?? "/");

  const subtitleMap: Record<Role, string> = {
    manager: "Manager · BrightFix",
    employee: "Employee · BrightFix",
    admin: "Admin · BrightFix",
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <AppSidebar
        items={items}
        activeHref={activeHref}
        userName={user?.name ?? "Amizka"}
        subtitle={subtitleMap[role]}
        onNavigate={(href) => navigate(href)}
      />
      <main style={{ flex: 1, padding: 24 }}>{children}</main>
    </div>
  );
}

export default function App() {
  return <BrowserRouter>
    <SessionProvider>
      <Routes>
        <Route element={<ClientShell />}>
          <Route index element={<LandingPage />} />
          <Route path="services" element={<DirectoryPage />} />
          <Route path="companies" element={<DirectoryPage />} />
          <Route path="companies/:id" element={<CompanyRoute />} />
          <Route path="companies/:id/request" element={<ClientGuard><RequestEntryRoute /></ClientGuard>} />
          <Route path="login" element={<AuthPage />} />
          <Route path="register" element={<AuthPage register />} />
          <Route path="verify-email" element={<EmailVerificationPage />} />
          <Route path="pending-verification" element={<PendingVerificationPage />} />
          <Route path="account-status" element={<PendingVerificationPage />} />
          <Route path="password-reset" element={<PasswordResetPage />} />
          <Route path="provider-onboarding" element={<ProviderOnboardingPage />} />
          <Route path="change-password" element={<ChangePasswordPage />} />
          <Route path="workspace" element={<WorkspacePage />} />
          <Route path="style-guide" element={<StyleGuidePage />} />
          <Route path="client" element={<ClientGuard><ClientDashboardPage /></ClientGuard>} />
          {(['requests', 'quotations', 'jobs', 'invoices', 'profile'] as const).map(tab => (
            <Route key={tab} path={`client/${tab}`} element={<ClientGuard><LegacyClientRoute tab={tab} /></ClientGuard>} />
          ))}
          {(['requests', 'quotations', 'jobs', 'invoices'] as const).map(tab => (
            <Route key={tab} path={`client/${tab}/:id`} element={<ClientGuard><LegacyClientRoute tab={tab} /></ClientGuard>} />
          ))}
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route path="/manager" element={<Shell role="manager"><ManagerDashboard /></Shell>} />
        <Route path="/manager/requests" element={<Shell role="manager"><RequestInbox /></Shell>} />
        <Route path="/manager/quotations" element={<Shell role="manager"><RequestInbox /></Shell>} />
        <Route path="/manager/quotations/:requestId" element={<Shell role="manager"><QuoteBuilder /></Shell>} />
        <Route path="/manager/jobs" element={<Shell role="manager"><ManagerJobs /></Shell>} />
        <Route path="/manager/schedule" element={<Shell role="manager"><ManagerSchedule /></Shell>} />
        <Route path="/manager/invoices" element={<Shell role="manager"><Invoices /></Shell>} />
        <Route path="/manager/ai" element={<Shell role="manager"><PolicyPage /></Shell>} />
        <Route path="/manager/company" element={<Shell role="manager"><CompanyProfilePage /></Shell>} />
        <Route path="/manager/team" element={<Shell role="manager"><ManagerTeam /></Shell>} />

        <Route path="/employee" element={<Shell role="employee"><EmployeeHome /></Shell>} />
        <Route path="/employee/jobs" element={<Shell role="employee"><EmployeeJobs /></Shell>} />
        <Route path="/employee/jobs/:jobId" element={<Shell role="employee"><EmployeeJobDetail /></Shell>} />
        <Route path="/employee/schedule" element={<Shell role="employee"><EmployeeSchedule /></Shell>} />

        <Route path="/admin" element={<Shell role="admin"><AdminHome /></Shell>} />
        <Route path="/admin/companies" element={<Shell role="admin"><AdminCompanies /></Shell>} />
        <Route path="/admin/catalog" element={<Shell role="admin"><AdminCatalog /></Shell>} />
        <Route path="/admin/settings" element={<Shell role="admin"><AdminSettings /></Shell>} />
      </Routes>
    </SessionProvider>
  </BrowserRouter>
}
function StyleGuidePage() {
  const [modal, setModal] = useState(false)
  return <><PageHeader eyebrow="SHARED UI · MEMBER 1" title="The ServiceFlow toolkit" description="One shared component library for public, client and operational screens. All examples below use sample content." /><div className="grid items-start gap-6 lg:grid-cols-2"><SurfaceCard className="space-y-5 p-6"><h2 className="sf-display text-xl font-semibold">Actions</h2><div className="flex flex-wrap gap-4"><ActionButton variant="stamp" onClick={() => setModal(true)}>Open example dialog</ActionButton><ActionButton>Secondary</ActionButton><ActionButton variant="void">Destructive</ActionButton><ActionButton disabled>Unavailable</ActionButton></div><Notice>Use the yellow stamp for the primary action. Pair destructive actions with confirmation.</Notice></SurfaceCard><SurfaceCard className="space-y-5 p-6"><h2 className="sf-display text-xl font-semibold">Form fields</h2><TextField label="Service address" placeholder="Enter your address" /><TextField label="Email address" error="Enter a valid email address." defaultValue="sample" /><SelectField label="Service"><option>Basic inspection</option></SelectField><TextField label="Unavailable field" disabled value="Not editable" /></SurfaceCard><SurfaceCard className="space-y-5 p-6"><h2 className="sf-display text-xl font-semibold">Status vocabulary</h2><div className="flex flex-wrap gap-3">{(['awaiting', 'approved', 'declined', 'scheduled', 'in_progress', 'completed', 'paid', 'unpaid', 'cancelled'] as const).map(status => <StatusBadge key={status} status={status} />)}</div><p className="text-sm text-text-secondary">Use the backend state and a text label. A status color alone is insufficient.</p></SurfaceCard><SurfaceCard className="space-y-5 p-6"><h2 className="sf-display text-xl font-semibold">Feedback</h2><Skeleton rows={2} /><Notice error>Sample error: this appointment is no longer available.</Notice><EmptyState title="No requests yet" description="Your service requests will appear here." /></SurfaceCard></div><SharedExamples /><Modal open={modal} title="Example confirmation" description="This demonstrates the shared keyboard-accessible dialog." onClose={() => setModal(false)}><ActionButton variant="stamp" onClick={() => setModal(false)}>Close example</ActionButton></Modal></>
}
function CompanyRoute() {
  const { id } = useParams()
  return <CompanyPage key={id} />
}

function NotFoundPage() {
  return <><PageHeader title="We couldn’t find that page" description="The link may have changed or the record may be unavailable." /><Link className="sf-link" to="/services">Browse services →</Link></>
}

