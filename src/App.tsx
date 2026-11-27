import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './layouts/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AdminSetupPage } from './pages/AdminSetupPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { BooksPage } from './pages/admin/BooksPage';
import { AuthorsPage } from './pages/admin/AuthorsPage';
import { MembersPage } from './pages/admin/MembersPage';
import { IssueBooksPage } from './pages/admin/IssueBooksPage';
import { ReturnBooksPage } from './pages/admin/ReturnBooksPage';
import { TransactionsPage } from './pages/admin/TransactionsPage';
import { FinesPage } from './pages/admin/FinesPage';
import { ReportsPage } from './pages/admin/ReportsPage';
import { MemberDashboard } from './pages/member/MemberDashboard';
import { BrowseBooksPage } from './pages/member/BrowseBooksPage';
import { ViewAuthorsPage } from './pages/member/ViewAuthorsPage';
import { MyBorrowedBooksPage } from './pages/member/MyBorrowedBooksPage';
import { MyTransactionsPage } from './pages/member/MyTransactionsPage';
import { MyFinesPage } from './pages/member/MyFinesPage';
import { MyProfilePage } from './pages/member/MyProfilePage';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login/admin" element={<LoginPage mode="ADMIN" />} />
          <Route path="/login/member" element={<LoginPage mode="MEMBER" />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/admin-setup" element={<AdminSetupPage />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRole="ADMIN">
                <AppLayout role="ADMIN" />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="books" element={<BooksPage />} />
            <Route path="authors" element={<AuthorsPage />} />
            <Route path="members" element={<MembersPage />} />
            <Route path="issue" element={<IssueBooksPage />} />
            <Route path="return" element={<ReturnBooksPage />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="fines" element={<FinesPage />} />
            <Route path="reports" element={<ReportsPage />} />
          </Route>

          <Route
            path="/member"
            element={
              <ProtectedRoute allowedRole="MEMBER">
                <AppLayout role="MEMBER" />
              </ProtectedRoute>
            }
          >
            <Route index element={<MemberDashboard />} />
            <Route path="books" element={<BrowseBooksPage />} />
            <Route path="authors" element={<ViewAuthorsPage />} />
            <Route path="borrowed" element={<MyBorrowedBooksPage />} />
            <Route path="transactions" element={<MyTransactionsPage />} />
            <Route path="fines" element={<MyFinesPage />} />
            <Route path="profile" element={<MyProfilePage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
