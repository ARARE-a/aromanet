import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SessionProvider } from "./contexts/SessionContext";

// Auth pages
import RoleSelect from "./pages/RoleSelect";
import StoreLogin from "./pages/auth/StoreLogin";
import TherapistLogin from "./pages/auth/TherapistLogin";
import CustomerLogin from "./pages/auth/CustomerLogin";
import StoreRegister from "./pages/auth/StoreRegister";
import TherapistRegister from "./pages/auth/TherapistRegister";
import CustomerRegister from "./pages/auth/CustomerRegister";

// Store pages
import StoreDashboard from "./pages/store/Dashboard";
import StoreReservations from "./pages/store/Reservations";
import StoreTherapists from "./pages/store/Therapists";
import StoreSales from "./pages/store/Sales";
import StoreShifts from "./pages/store/Shifts";
import StoreMenus from "./pages/store/Menus";
import StoreReviews from "./pages/store/Reviews";
import StoreProfile from "./pages/store/Profile";
import StorePayroll from "./pages/store/Payroll";
import StoreCustomers from "./pages/store/Customers";
import StoreRooms from "./pages/store/Rooms";
import StoreAffiliations from "./pages/store/Affiliations";

// Therapist pages
import TherapistDashboard from "./pages/therapist/Dashboard";
import TherapistProfile from "./pages/therapist/Profile";
import TherapistShifts from "./pages/therapist/Shifts";
import TherapistReservations from "./pages/therapist/Reservations";
import TherapistPosts from "./pages/therapist/Posts";
import TherapistMemos from "./pages/therapist/Memos";
import TherapistSales from "./pages/therapist/Sales";
import TherapistAffiliations from "./pages/therapist/Affiliations";

// Customer pages
import CustomerHome from "./pages/customer/Home";
import CustomerSearch from "./pages/customer/Search";
import StoreDetail from "./pages/customer/StoreDetail";
import TherapistDetail from "./pages/customer/TherapistDetail";
import CustomerReservations from "./pages/customer/Reservations";
import CustomerMyPage from "./pages/customer/MyPage";
import CustomerLevel from "./pages/customer/Level";
import CustomerNotifications from "./pages/customer/Notifications";
import CustomerFavorites from "./pages/customer/Favorites";
import CustomerEditProfile from "./pages/customer/EditProfile";
import CustomerVerification from "./pages/customer/Verification";

// Shared pages
import MessagesPage from "./pages/Messages";

function Router() {
  return (
    <Switch>
      {/* Root */}
      <Route path="/" component={RoleSelect} />

      {/* Auth */}
      <Route path="/store/login" component={StoreLogin} />
      <Route path="/store/register" component={StoreRegister} />
      <Route path="/therapist/login" component={TherapistLogin} />
      <Route path="/therapist/register" component={TherapistRegister} />
      <Route path="/customer/login" component={CustomerLogin} />
      <Route path="/customer/register" component={CustomerRegister} />

      {/* Store */}
      <Route path="/store/dashboard" component={StoreDashboard} />
      <Route path="/store/reservations" component={StoreReservations} />
      <Route path="/store/therapists" component={StoreTherapists} />
      <Route path="/store/sales" component={StoreSales} />
      <Route path="/store/shifts" component={StoreShifts} />
      <Route path="/store/menus" component={StoreMenus} />
      <Route path="/store/reviews" component={StoreReviews} />
      <Route path="/store/profile" component={StoreProfile} />
      <Route path="/store/payroll" component={StorePayroll} />
      <Route path="/store/customers" component={StoreCustomers} />
      <Route path="/store/rooms" component={StoreRooms} />
      <Route path="/store/affiliations" component={StoreAffiliations} />

      {/* Therapist */}
      <Route path="/therapist/dashboard" component={TherapistDashboard} />
      <Route path="/therapist/profile" component={TherapistProfile} />
      <Route path="/therapist/shifts" component={TherapistShifts} />
      <Route path="/therapist/reservations" component={TherapistReservations} />
      <Route path="/therapist/posts" component={TherapistPosts} />
      <Route path="/therapist/memos" component={TherapistMemos} />
      <Route path="/therapist/sales" component={TherapistSales} />
      <Route path="/therapist/affiliations" component={TherapistAffiliations} />

      {/* Customer */}
      <Route path="/home" component={CustomerHome} />
      <Route path="/search" component={CustomerSearch} />
      <Route path="/store/:id" component={StoreDetail} />
      <Route path="/therapist/:id" component={TherapistDetail} />
      <Route path="/my/reservations" component={CustomerReservations} />
      <Route path="/my/page" component={CustomerMyPage} />
      <Route path="/my/level" component={CustomerLevel} />
      <Route path="/my/notifications" component={CustomerNotifications} />
      <Route path="/my/favorites" component={CustomerFavorites} />
      <Route path="/my/edit" component={CustomerEditProfile} />
      <Route path="/my/edit-profile" component={CustomerEditProfile} />
      <Route path="/my/verification" component={CustomerVerification} />

      {/* Shared */}
      <Route path="/messages" component={MessagesPage} />
      <Route path="/messages/:threadId" component={MessagesPage} />

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <SessionProvider>
          <TooltipProvider>
            <Toaster richColors position="top-center" />
            <Router />
          </TooltipProvider>
        </SessionProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
