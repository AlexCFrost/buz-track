export enum View {
  Home = 'HOME',
  Creator = 'CREATOR',
  Joiner = 'JOINER',
}

export interface SharedUser {
  id: string;
  lat: number;
  lng: number;
  expiresAt: number;
  profilePic: string;
  displayName?: string;
  email?: string;
}

export interface ChatMessage {
    sender: 'user' | 'gemini';
    text: string;
    sources?: GroundingSource[];
}

export interface GroundingSource {
    uri: string;
    title: string;
}
