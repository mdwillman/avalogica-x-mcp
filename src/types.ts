/**
 * Type definitions for Avalogica X MCP
 */

// --- X OAuth / Credentials ---

export interface XCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;        // seconds since epoch
  twitterUserId: string;
  twitterHandle?: string;   // like "@username"
}

export interface LinkXAccountArgs {
  userId: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
}

export interface LinkXAccountResult {
  ok: boolean;
  twitterHandle?: string;
  twitterUserId?: string;
}

export interface PostToXArgs {
  userId: string;
  blurb: string;
}

export interface PostToXResult {
  ok: boolean;
  tweetUrl: string;
}

// --- Posts / Timeline ---

export interface XPost {
  id: string;
  text: string;
  createdAt: string;
  lang?: string;
}

export interface GetRecentPostsArgs {
  userId: string;
  limit?: number;       // default 20, max 100
}

export interface GetRecentPostsResult {
  posts: XPost[];
  twitterUserId: string;
  twitterHandle?: string;
}

// --- Summarization ---

export type PostSummaryFocus = "all" | "tone" | "topics" | "interests";

export interface SummarizePostHistoryArgs {
  userId: string;
  limit?: number;           // how many posts to analyze (default 50)
  focus?: PostSummaryFocus; // "all" by default
}

export interface SummarizePostHistoryResult {
  focus: PostSummaryFocus;
  totalPostsAnalyzed: number;
  sampleRangeDescription: string; // e.g. "Last 37 posts over ~14 days"
  toneSummary: string;
  topicSummary: string;
  interestSummary: string;
  suggestionsForBranding: string;
}