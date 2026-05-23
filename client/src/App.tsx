import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Quotes from "./pages/Quotes";
import QuoteDetail from "./pages/QuoteDetail";
import QuoteBuilder from "./pages/QuoteBuilder";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import Inventory from "./pages/Inventory";
import PriceLists from "./pages/PriceLists";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Login from "./pages/Login";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        {() => (
          <AppLayout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/clients" component={Clients} />
              <Route path="/clients/:id" component={ClientDetail} />
              <Route path="/quotes" component={Quotes} />
              <Route path="/quotes/new" component={QuoteBuilder} />
              <Route path="/quotes/:id" component={QuoteDetail} />
              <Route path="/quotes/:id/edit" component={QuoteBuilder} />
              <Route path="/orders" component={Orders} />
              <Route path="/orders/:id" component={OrderDetail} />
              <Route path="/inventory" component={Inventory} />
              <Route path="/price-lists" component={PriceLists} />
              <Route path="/analytics" component={Analytics} />
              <Route path="/settings" component={Settings} />
              <Route component={NotFound} />
            </Switch>
          </AppLayout>
        )}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster position="top-right" richColors />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
