import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';
import NewsPage from './pages/NewsPage';
import StandardsPage from './pages/StandardsPage';
import RecognitionPage from './pages/RecognitionPage';
import RecognitionResultPage from './pages/RecognitionResult';
import RecognitionHistoryPage from './pages/RecognitionHistory';
import ProfilePage from './pages/ProfilePage';
import EditProfilePage from './pages/EditProfile';
import CollectionPage from './pages/Collection';
import SettingsPage from './pages/Settings';
import AgreementPage from './pages/Agreement';

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <ToastProvider>
          <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/news" replace />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/standards" element={<StandardsPage />} />
            <Route path="/recognition" element={<RecognitionPage />} />
            <Route path="/recognition/result" element={<RecognitionResultPage />} />
            <Route path="/recognition/history" element={<RecognitionHistoryPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/edit" element={<EditProfilePage />} />
            <Route path="/profile/collection" element={<CollectionPage />} />
            <Route path="/profile/settings" element={<SettingsPage />} />
            <Route path="/agreement/user" element={<AgreementPage />} />
            <Route path="/agreement/privacy" element={<AgreementPage />} />
          </Route>
        </Routes>
        </ToastProvider>
      </AppProvider>
    </BrowserRouter>
  );
}