export type TabKey = 'news' | 'standards' | 'recognition' | 'profile';

export type NewsItem = {
  id: string;
  title: string;
  summary: string;
  date: string;
  source: string;
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
  confidence: number;
  label: string;
  timestamp: string;
  filename: string;
  cottonAreaImage: string | null;
  impurityAreaImage: string | null;
  detectionResult: DetectionResult;
  metrics: RecognitionMetric[];
  details: RecognitionMetric[];
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
  | { name: 'recognitionResult'; result: RecognitionResult; returnTo?: 'recognition' | 'history' }
  | { name: 'recognitionHistory' }
  | { name: 'editProfile' }
  | { name: 'collection' }
  | { name: 'settings' }
  | { name: 'agreement'; kind: 'user' | 'privacy' };

