import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Outlet } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/layout/ProtectedRoute";

import Index from "./pages/Index";
import ScrollToTop from "./components/ScrollToTop"; // Import ScrollToTop
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import Catalogo from "./pages/Catalogo";
import Nosotros from "./pages/Nosotros";
import Verificar from "./pages/Verificar";
import Dashboard from "./pages/Dashboard";
import CursoDetalle from "./pages/CursoDetalle";
import NotFound from "./pages/NotFound";
import FAQ from "./pages/static/FAQ";

// Student Routes
import Classroom from "./pages/Classroom";
import Checkout from "./pages/checkout/Checkout";
import PaymentSuccess from "./pages/checkout/PaymentSuccess";
import EditProfile from "./pages/student/EditProfile";
import InstructorProfile from "./pages/instructor/InstructorProfile";
import CertificateViewer from "./pages/student/CertificateViewer";

// Admin Imports
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCourses from "./pages/admin/AdminCourses";
import AdminEnrollments from "./pages/admin/AdminEnrollments";
import AdminUsers from "./pages/admin/AdminUsers";

import AdminSettings from "./pages/admin/AdminSettings";
import CourseBuilder from "./pages/admin/CourseBuilder";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <ScrollToTop /> {/* Add here inside Router */}
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/catalogo" element={<Catalogo />} />
            <Route path="/nosotros" element={<Nosotros />} />
            <Route path="/verificar" element={<Verificar />} />
            <Route path="/verify/:code" element={<Verificar />} />
            <Route path="/certificate/:id" element={<CertificateViewer />} />
            <Route path="/faq" element={<FAQ />} />

            <Route path="/curso/:id" element={<CursoDetalle />} />

            {/* Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected Student Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/classroom/:courseId" element={<Classroom />} />
              <Route path="/checkout/:courseId" element={<Checkout />} />
              <Route path="/checkout/success" element={<PaymentSuccess />} />
              <Route path="/profile/edit" element={<EditProfile />} />
              <Route path="/instructor/:id" element={<InstructorProfile />} />
            </Route>

            {/* Protected Admin Routes */}
            <Route element={<ProtectedRoute requireAdmin={true} />}>
              <Route path="/admin" element={<AdminLayout><Outlet /></AdminLayout>}>
                <Route index element={<AdminDashboard />} />
                <Route path="courses" element={<AdminCourses />} />
                <Route path="sales" element={<AdminEnrollments />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="courses/new" element={<CourseBuilder />} />
                <Route path="courses/:id" element={<CourseBuilder />} />
              </Route>
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider >
  );
};

export default App;
