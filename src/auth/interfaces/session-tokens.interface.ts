import { SignedAccessToken, GeneratedRefreshToken } from '../services/token.service';

export interface SessionTokens {
  accessToken: SignedAccessToken;
  refreshToken: GeneratedRefreshToken;
  sessionId: string;
}
