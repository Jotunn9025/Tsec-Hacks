import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Wallet from "./pages/Wallet";
import NotFound from "./pages/NotFound";

// Student Pages
import StudentDashboard from "./pages/StudentDashboard";
import StudentCourses from "./pages/StudentCourses";
import StudentCourseView from "./pages/StudentCourseView";
import LecturePlayer from "./pages/LecturePlayer";

// Instructor Pages
import InstructorDashboard from "./pages/InstructorDashboard";
import InstructorCourseNew from "./pages/InstructorCourseNew";
import InstructorCourseView from "./pages/InstructorCourseView";
import InstructorLectureNew from "./pages/InstructorLectureNew";
import { ChatBot } from "@/components/ChatBot";

const queryClient = new QueryClient();

// Root redirect based on user role
const RootRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Index />;
  }

  if (user.role === 'instructor') {
    return <Navigate to="/instructor/dashboard" replace />;
  }

  return <Navigate to="/student/dashboard" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/wallet" element={<Wallet />} />

            {/* Student Routes */}
            <Route path="/student/dashboard" element={
              <ProtectedRoute requireRole="user">
                <StudentDashboard />
              </ProtectedRoute>
            } />
            <Route path="/student/courses" element={
              <ProtectedRoute requireRole="user">
                <StudentCourses />
              </ProtectedRoute>
            } />
            <Route path="/student/courses/:courseId" element={
              <ProtectedRoute requireRole="user">
                <StudentCourseView />
              </ProtectedRoute>
            } />
            <Route path="/student/lecture/:lectureId" element={
              <ProtectedRoute requireRole="user">
                <LecturePlayer />
              </ProtectedRoute>
            } />

            {/* Instructor Routes */}
            <Route path="/instructor/dashboard" element={
              <ProtectedRoute requireRole="instructor">
                <InstructorDashboard />
              </ProtectedRoute>
            } />
            <Route path="/instructor/courses/new" element={
              <ProtectedRoute requireRole="instructor">
                <InstructorCourseNew />
              </ProtectedRoute>
            } />
            <Route path="/instructor/courses/:courseId" element={
              <ProtectedRoute requireRole="instructor">
                <InstructorCourseView />
              </ProtectedRoute>
            } />
            <Route path="/instructor/courses/:courseId/lectures/new" element={
              <ProtectedRoute requireRole="instructor">
                <InstructorLectureNew />
              </ProtectedRoute>
            } />

            <Route path="*" element={<NotFound />} />
          </Routes>
          <ChatBot />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
