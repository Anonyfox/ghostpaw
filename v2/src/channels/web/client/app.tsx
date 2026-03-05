import { Redirect, Route, Switch } from "wouter-preact";
import { Layout } from "./components/layout.tsx";
import { ChatPage } from "./pages/chat.tsx";
import { CostsPage } from "./pages/costs.tsx";
import { DashboardPage } from "./pages/dashboard.tsx";
import { LoginPage } from "./pages/login.tsx";
import { MemoriesPage } from "./pages/memories.tsx";
import { SessionsPage } from "./pages/sessions.tsx";
import { SettingsPage } from "./pages/settings.tsx";
import { SoulDetailPage } from "./pages/soul_detail.tsx";
import { SoulsPage } from "./pages/souls.tsx";
import { TrainingGroundsPage } from "./pages/training_grounds.tsx";

function AuthenticatedRoutes() {
  return (
    <Layout>
      <Switch>
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/memories" component={MemoriesPage} />
        <Route path="/costs" component={CostsPage} />
        <Route path="/sessions" component={SessionsPage} />
        <Route path="/souls" component={SoulsPage} />
        <Route path="/souls/:id" component={SoulDetailPage} />
        <Route path="/training-grounds" component={TrainingGroundsPage} />
        <Route path="/chat" component={ChatPage} />
        <Route path="/chat/:id" component={ChatPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/">
          <Redirect to="/dashboard" />
        </Route>
        <Route>
          <p class="text-muted">Page not found.</p>
        </Route>
      </Switch>
    </Layout>
  );
}

export function App() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route component={AuthenticatedRoutes} />
    </Switch>
  );
}
