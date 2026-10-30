import { LeaderboardEntry, Mentor, CommunityPost, RoadmapLevel, TaskItem, UserProfile } from '../types';

// No demo/seed records. Real users and mentors come from Clerk/Supabase.
export const initialUserProfile: UserProfile | null = null;
export const initialTasks: TaskItem[] = [];
export const initialLeaderboard: LeaderboardEntry[] = [];
export const initialMentors: Mentor[] = [];
export const initialPosts: CommunityPost[] = [];
export const initialRoadmapLevels: RoadmapLevel[] = [];
