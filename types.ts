
export type ImageSize = '1K' | '2K' | '4K';

export interface ColoringPageData {
  id: string;
  prompt: string;
  imageUrl?: string;
  loading: boolean;
  error?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface GeneratorState {
  childName: string;
  theme: string;
  imageSize: ImageSize;
  isGenerating: boolean;
  pages: ColoringPageData[];
}
