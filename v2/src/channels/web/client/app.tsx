import { Redirect, Route, Switch } from "wouter-preact";
import { Layout } from "./components/layout.tsx";
import { ChatPage } from "./pages/chat.tsx";
import { DashboardPage } from "./pages/dashboard.tsx";
import { LoginPage } from "./pages/login.tsx";
import { SettingsPage } from "./pages/settings.tsx";

function AuthenticatedRoutes() {
  return (
    <Layout>
      <Switch>
        <Route path="/dashboard" component={DashboardPage} />
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
