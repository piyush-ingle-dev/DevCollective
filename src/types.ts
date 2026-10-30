export type UserRole = 'student' | 'mentor' | 'faculty' | 'admin';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  college: string;
  branch: string;
  academicYear: string;
  avatar: string;
  bio: string;
  rep: number;
  level: number;
  streakDays: number;
  githubUrl?: string;
  linkedinUrl?: string;
  skills: string[];
  selectedDomains: string[];
  authProvider: 'email' | 'google' | 'github' | 'clerk';
  hasCompletedOnboarding?: boolean;
  mentorVerifiedAt?: string | null;
  accountStatus?: 'active' | 'pending' | 'suspended';
  createdAt: string;
}

export interface TaskItem {
  id: string;
  title: string;
  estimatedMinutes: number;
  repReward: number;
  completed: boolean;
}

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorCollege: string;
  authorAvatar: string;
  authorRole: string;
  authorRep: number;
  authorAcademicYear?: string;
  authorLevel?: number;
  category: 'Build in Public' | 'Questions' | 'Projects' | 'Hackathons' | 'AI' | 'Android' | 'General';
  title?: string;
  content: string;
  imageUrl?: string;
  likes: number;
  commentsCount: number;
  createdAt: string;
  updatedAt?: string;
  likedByMe?: boolean;
}

export interface CommunityComment {
  id: string;
  postId: string;
  parentCommentId?: string | null;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorRole: string;
  authorRep: number;
  authorAcademicYear?: string;
  authorLevel?: number;
  content: string;
  createdAt: string;
  updatedAt?: string;
  likes: number;
  likedByMe?: boolean;
}

export interface NotificationItem {
  id: string;
  type: 'post_like' | 'comment_like' | 'comment_reply' | 'follow' | 'connection_request' | 'connection_accepted';
  actorId: string;
  actorName: string;
  actorAvatar: string;
  actorGithubUrl?: string | null;
  actorLinkedinUrl?: string | null;
  postId?: string | null;
  commentId?: string | null;
  postTitle: string;
  commentPreview: string;
  createdAt: string;
  readAt?: string | null;
}

export interface FacultyProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  college: string;
  designation: string;
  department: string;
  employeeId: string;
  subjects: string[];
  expertise: string[];
  yearsExperience: number | null;
  mentoringAreas: string[];
  bio: string;
  availabilityStatus: 'available' | 'busy' | 'offline';
  availabilityNote: string;
  verified: boolean;
  joinedAt?: string | null;
}

export interface Mentor {
  id: string;
  name: string;
  title: string;
  college: string;
  avatar: string;
  roleType: 'SENIOR' | 'FACULTY' | 'ALUMNI' | 'INDUSTRY';
  company?: string;
  skills: string[];
  level: number;
  rep: number;
  rating: number;
  studentsHelped: number;
  bio: string;
  availability: string;
  isBusy?: boolean;
  verified?: boolean;
}

export interface RoadmapLevel {
  levelNumber: number;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'locked';
  repRequirement: number;
  topics: string[];
  capstoneProject: {
    title: string;
    description: string;
    unlocked: boolean;
  };
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  avatar: string;
  college: string;
  branch: string;
  rep: number;
  level: number;
  streakDays: number;
  isUser?: boolean;
}

export interface DevEventDetails {
  specialNote?: string;
  quote?: string;
  presidedBy?: string;
  presidedByTitle?: string;
  organizedBy?: string;
  mainDate?: string;
  mainTime?: string;
  instructions?: string[];
  schedule?: Array<{
    date: string;
    day: string;
    morning: string;
    afternoon: string;
  }>;
}

export interface DevEvent {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  startsAt: string;
  endsAt: string;
  venue: string;
  city: string;
  organizer: string;
  registrationUrl?: string | null;
  sourceUrl?: string | null;
  ticketInfo?: string | null;
  theme: {
    background: string;
    foreground: string;
    primary: string;
    secondary: string;
    accent: string;
  };
  speakers: string[];
  coordinators: string[];
  contactInfo?: string | null;
  details?: DevEventDetails;
  createdAt: string;
  updatedAt: string;
}
