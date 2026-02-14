import { createSchema, createYoga } from 'graphql-yoga';
// UPDATE: Import from your singleton, not the raw client
import prisma from '@/lib/prisma';

// ==========================================
// ENHANCED GRAPHQL SCHEMA
// ==========================================
const typeDefs = `
  type Resource {
    id: String
    title: String
    url: String
    type: String
  }
  
  type Milestone {
    id: String
    title: String
    description: String
    week: Int
    status: String
    resources: [Resource]
    order: Int
    estimatedHours: Int
    difficulty: String
    progress: MilestoneProgress
    quizzes: [Quiz]
  }
  
  type Roadmap {
    id: String
    title: String
    createdAt: String
    milestones: [Milestone]
    totalWeeks: Int
    difficulty: String
    isCompleted: Boolean
    completedAt: String
    completionPercentage: Int
  }
  
  type MilestoneProgress {
    id: String
    status: String
    startedAt: String
    completedAt: String
    timeSpentMins: Int
    resourcesViewed: [String]
  }
  
  type Quiz {
    id: String
    question: String
    options: [String]
    correctIndex: Int
    explanation: String
    difficulty: String
    userAttempts: [QuizAttempt]
    isPassed: Boolean
  }
  
  type QuizAttempt {
    id: String
    selectedIndex: Int
    isCorrect: Boolean
    attemptedAt: String
  }
  
  type LearningStats {
    totalXP: Int
    level: Int
    currentStreak: Int
    longestStreak: Int
    milestonesCompleted: Int
    quizzesPassed: Int
    totalTimeSpentMins: Int
    badgeCount: Int
    xpToNextLevel: Int
    nextLevelXP: Int
  }
  
  type Achievement {
    id: String
    badgeId: String
    badgeName: String
    badgeIcon: String
    description: String
    earnedAt: String
  }
  
  type DailyGoal {
    id: String
    date: String
    targetMins: Int
    targetQuizzes: Int
    minsCompleted: Int
    quizzesSolved: Int
    isCompleted: Boolean
    progressPercentage: Int
  }
  
  type UserProgress {
    stats: LearningStats
    achievements: [Achievement]
    dailyGoal: DailyGoal
    recentActivity: [Activity]
  }
  
  type Activity {
    type: String
    description: String
    timestamp: String
    xpGained: Int
  }
  
  type Query {
    myRoadmaps(userId: String!): [Roadmap]
    roadmapWithProgress(userId: String!, roadmapId: String!): Roadmap
    myProgress(userId: String!): UserProgress
    dailyGoal(userId: String!): DailyGoal
    leaderboard(limit: Int): [LeaderboardEntry]
  }
  
  type LeaderboardEntry {
    userId: String
    userName: String
    level: Int
    totalXP: Int
    currentStreak: Int
    rank: Int
  }
  
  type Mutation {
    startMilestone(userId: String!, milestoneId: String!): MilestoneProgress
    completeMilestone(userId: String!, milestoneId: String!): MilestoneProgress
    submitQuiz(userId: String!, quizId: String!, selectedIndex: Int!): QuizResult
  }
  
  type QuizResult {
    isCorrect: Boolean
    correctIndex: Int
    explanation: String
    xpGained: Int
  }
`;

// ==========================================
// RESOLVERS
// ==========================================
const resolvers = {
  Query: {
    myRoadmaps: async (_: any, { userId }: { userId: string }) => {
      // Ensure user exists before query to prevent foreign key errors
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return [];

      const roadmaps = await prisma.roadmap.findMany({
        where: { userId },
        include: {
          milestones: {
            include: {
              resources: true,
              progress: { where: { userId } },
              quizzes: {
                include: { attempts: { where: { userId } } }
              }
            },
            orderBy: { order: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return roadmaps.map(roadmap => ({
        ...roadmap,
        completionPercentage: calculateCompletionPercentage(roadmap, userId),
        milestones: roadmap.milestones.map(m => ({
          ...m,
          progress: m.progress[0] || null,
          quizzes: m.quizzes.map(q => ({
            ...q,
            userAttempts: q.attempts,
            isPassed: q.attempts.some(a => a.isCorrect)
          }))
        }))
      }));
    },

    roadmapWithProgress: async (_: any, { userId, roadmapId }: any) => {
      const roadmap = await prisma.roadmap.findUnique({
        where: { id: roadmapId },
        include: {
          milestones: {
            include: {
              resources: true,
              progress: { where: { userId } },
              quizzes: {
                include: { attempts: { where: { userId } } }
              }
            },
            orderBy: { order: 'asc' }
          }
        }
      });

      if (!roadmap) return null;

      return {
        ...roadmap,
        completionPercentage: calculateCompletionPercentage(roadmap, userId),
        milestones: roadmap.milestones.map(m => ({
          ...m,
          progress: m.progress[0] || null,
          quizzes: m.quizzes.map(q => ({
            ...q,
            userAttempts: q.attempts,
            isPassed: q.attempts.some(a => a.isCorrect)
          }))
        }))
      };
    },

    myProgress: async (_: any, { userId }: { userId: string }) => {
      const stats = await prisma.learningStats.findUnique({
        where: { userId }
      });

      const achievements = await prisma.userAchievement.findMany({
        where: { userId },
        orderBy: { earnedAt: 'desc' },
        take: 10
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dailyGoal = await prisma.dailyGoal.findUnique({
        where: {
          userId_date: { userId, date: today }
        }
      });

      const recentProgress = await prisma.milestoneProgress.findMany({
        where: { userId, status: 'completed' },
        orderBy: { completedAt: 'desc' },
        take: 5,
        include: { milestone: true }
      });

      const recentQuizzes = await prisma.quizAttempt.findMany({
        where: { userId },
        orderBy: { attemptedAt: 'desc' },
        take: 5,
        include: { quiz: { include: { milestone: true } } }
      });

      const recentActivity = [
        ...recentProgress.map(p => ({
          type: 'milestone_completed',
          description: `Completed: ${p.milestone.title}`,
          timestamp: p.completedAt?.toISOString() || '',
          xpGained: 100
        })),
        ...recentQuizzes.map(q => ({
          type: q.isCorrect ? 'quiz_passed' : 'quiz_failed',
          description: `${q.isCorrect ? 'Passed' : 'Attempted'} quiz in ${q.quiz.milestone.title}`,
          timestamp: q.attemptedAt.toISOString(),
          xpGained: q.isCorrect ? 25 : 5
        }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);

      return {
        stats: stats ? {
          ...stats,
          xpToNextLevel: calculateXPToNextLevel(stats.totalXP),
          nextLevelXP: calculateNextLevelXP(stats.level)
        } : null,
        achievements,
        dailyGoal: dailyGoal ? {
          ...dailyGoal,
          progressPercentage: calculateDailyGoalProgress(dailyGoal)
        } : null,
        recentActivity
      };
    },

    dailyGoal: async (_: any, { userId }: { userId: string }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const goal = await prisma.dailyGoal.findUnique({
        where: {
          userId_date: { userId, date: today }
        }
      });

      if (!goal) {
        return {
          targetMins: 30,
          targetQuizzes: 3,
          minsCompleted: 0,
          quizzesSolved: 0,
          isCompleted: false,
          progressPercentage: 0
        };
      }

      return {
        ...goal,
        progressPercentage: calculateDailyGoalProgress(goal)
      };
    },

    leaderboard: async (_: any, { limit = 10 }: { limit?: number }) => {
      const topUsers = await prisma.learningStats.findMany({
        take: limit,
        orderBy: [
          { totalXP: 'desc' },
          { level: 'desc' }
        ],
        include: { user: true }
      });

      return topUsers.map((stats, index) => ({
        userId: stats.userId,
        userName: stats.user.fullName || 'Anonymous',
        level: stats.level,
        totalXP: stats.totalXP,
        currentStreak: stats.currentStreak,
        rank: index + 1
      }));
    }
  },

  Mutation: {
    startMilestone: async (_: any, { userId, milestoneId }: any) => {
      return await prisma.milestoneProgress.upsert({
        where: {
          userId_milestoneId: { userId, milestoneId }
        },
        update: {
          status: 'in_progress',
          startedAt: new Date()
        },
        create: {
          userId,
          milestoneId,
          status: 'in_progress',
          startedAt: new Date()
        }
      });
    },

    completeMilestone: async (_: any, { userId, milestoneId }: any) => {
      return await prisma.milestoneProgress.update({
        where: {
          userId_milestoneId: { userId, milestoneId }
        },
        data: {
          status: 'completed',
          completedAt: new Date()
        }
      });
    },

    submitQuiz: async (_: any, { userId, quizId, selectedIndex }: any) => {
      const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
      if (!quiz) throw new Error('Quiz not found');

      const isCorrect = selectedIndex === quiz.correctIndex;

      await prisma.quizAttempt.create({
        data: {
          userId,
          quizId,
          selectedIndex,
          isCorrect
        }
      });

      return {
        isCorrect,
        correctIndex: quiz.correctIndex,
        explanation: quiz.explanation,
        xpGained: isCorrect ? 25 : 5
      };
    }
  }
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================
function calculateCompletionPercentage(roadmap: any, userId: string): number {
  const totalMilestones = roadmap.milestones.length;
  if (totalMilestones === 0) return 0;
  const completedCount = roadmap.milestones.filter((m: any) =>
    m.progress && m.progress.some((p: any) => p.userId === userId && p.status === 'completed')
  ).length;
  return Math.round((completedCount / totalMilestones) * 100);
}

function calculateXPToNextLevel(currentXP: number): number {
  const currentLevel = Math.floor(Math.sqrt(currentXP / 100)) + 1;
  const nextLevelXP = (currentLevel * currentLevel) * 100;
  return nextLevelXP - currentXP;
}

function calculateNextLevelXP(currentLevel: number): number {
  return (currentLevel * currentLevel) * 100;
}

function calculateDailyGoalProgress(goal: any): number {
  const timeProgress = (goal.minsCompleted / goal.targetMins) * 50;
  const quizProgress = (goal.quizzesSolved / goal.targetQuizzes) * 50;
  return Math.min(100, Math.round(timeProgress + quizProgress));
}

// ==========================================
// CREATE YOGA INSTANCE
// ==========================================
const schema = createSchema({ typeDefs, resolvers });

const yoga = createYoga({
  schema,
  graphqlEndpoint: '/api/graphql-api',
  fetchAPI: { Response }
});

export { yoga as GET, yoga as POST };