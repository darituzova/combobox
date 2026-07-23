import { FC } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ResetPassword from '@/pages/ResetPassword';
import Dashboard from '@/pages/Dashboard';
import MapPage from '@/pages/Map';
import Devices from '@/pages/Devices';
import DeviceDetail from '@/pages/DeviceDetail';
import Comparison from '@/pages/Comparison';
import Alerts from '@/pages/Alerts';
import Settings from '@/pages/Settings';

const AppRouter: FC = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route
      path="/dashboard"
      element={
        <ProtectedRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/map"
      element={
        <ProtectedRoute>
          <Layout>
            <MapPage />
          </Layout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/devices"
      element={
        <ProtectedRoute>
          <Layout>
            <Devices />
          </Layout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/device/:id"
      element={
        <ProtectedRoute>
          <Layout>
            <DeviceDetail />
          </Layout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/comparison"
      element={
        <ProtectedRoute>
          <Layout>
            <Comparison />
          </Layout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/alerts"
      element={
        <ProtectedRoute>
          <Layout>
            <Alerts />
          </Layout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/settings"
      element={
        <ProtectedRoute>
          <Layout>
            <Settings />
          </Layout>
        </ProtectedRoute>
      }
    />
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);

export default AppRouter;
