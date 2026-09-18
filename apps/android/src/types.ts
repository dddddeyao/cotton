export type TabKey = 'news' | 'standards' | 'recognition' | 'profile';

export type NewsItem = {
  id: string;
  title: string;
  summary: string;
  content: string;
  date: string;
  source: string;
  sourceUrl: string;
  imageUrl: string;
  category: string;
  keywords: string;
  tone: 'blue' | 'green' | 'orange' | 'purple';
};

export type RecognitionMetric = {
  label: string;
  value: string;
  hint?: string;
};

export type DetectionResult = {
  colorGrade: number | null;
  impurityGrade: number | null;
  cottonArea: number | null;
  impurityArea: number | null;
  areaRatio: number | null;
  confidence: number | null;
};

export type RecognitionResult = {
  id: string;
  imageUri: string;
  createdAt: string;
  grade: string;
  confidence: number | null;
  label: string;
  timestamp: string;
  filename: string;
  colorFeedbackImage: string | null;
  cottonMaskImage: string | null;
  impurityMaskImage: string | null;
  cottonOverlayImage: string | null;
  impurityOverlayImage: string | null;
  blackBackgroundImpurityOverlay: string | null;
  detectionResult: DetectionResult;
  metrics: RecognitionMetric[];
  conclusion: string;
  isLocal: boolean;
};

export type UserSession = {
  username: string;
  token: string;
};

export type UserProfile = {
  username: string;
  nickname: string;
  phone: string;
  organization: string;
  role: string;
};

export type RecognitionUploadFieldName = 'file' | 'image' | 'photo';

export type AppView =
  | { name: 'tabs' }
  | { name: 'newsDetail'; item: NewsItem }
  | { name: 'recognitionResult'; result: RecognitionResult }
  | { name: 'recognitionHistory' }
  | { name: 'editProfile' }
  | { name: 'settings' }
  | { name: 'agreement'; kind: 'user' | 'privacy' };