import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ==========================================
// ACHIEVEMENT DEFINITIONS
// ==========================================
const ACHIEVEMENTS = {
  FIRST_MILESTONE: {
    id: 'first_milestone',
    name: 'Getting Started',
    icon: '🎯',
    description: 'Complete your first milestone'
  },
  QUIZ_MASTER: {
    id: 'quiz_master',
    name: 'Quiz Master',
    icon: '🧠',
    description: 'Pass 10 quizzes'
  },
  WEEK_STREAK: {
    id: 'week_streak',
    name: 'Week Warrior',
    icon: '🔥',
    description: 'Maintain a 7-day streak'
  },
  SPEED_LEARNER: {
    id: 'speed_learner',
    name: 'Speed Learner',
    icon: '⚡',
    description: 'Complete a milestone in under 3 days'
  },
  DEDICATED: {
    id: 'dedicated',
    name: 'Dedicated Learner',
    icon: '💎',
    description: 'Study for 10 hours total'
  },
  ROADMAP_COMPLETE: {
    id: 'roadmap_complete',
    name: 'Mission Complete',
    icon: '🏆',
    description: 'Complete an entire roadmap'
  }
};

// ==========================================
// XP & LEVEL CALCULATION
// ==========================================
function calculateXP(action: string): number {
  const xpTable: Record<string, number> = {
    'milestone_start': 10,
    'milestone_complete': 100,
    'quiz_pass': 25,
    'quiz_fail': 5,
    'resource_view': 5,
    'daily_goal': 50,
    'streak_day': 15
  };
  return xpTable[action] || 0;
}

function calculateLevel(totalXP: number): number {
  // Level formula: level = floor(sqrt(totalXP / 100)) + 1
  return Math.floor(Math.sqrt(totalXP / 100)) + 1;
}

// ==========================================
// GAMIFICATION HELPERS
// ==========================================
async function updateStreak(userId: string): Promise<void> {
  const stats = await prisma.learningStats.findUnique({
    where: { userId }
  });

  if (!stats) return;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastActive = stats.lastActiveDate 
    ? new Date(stats.lastActiveDate.getFullYear(), stats.lastActiveDate.getMonth(), stats.lastActiveDate.getDate())
    : null;

  let newStreak = stats.currentStreak;

  if (!lastActive) {
    newStreak = 1;
  } else {
    const daysDiff = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) {
      // Same day, no change
      return;
    } else if (daysDiff === 1) {
      // Consecutive day
      newStreak = stats.currentStreak + 1;
    } else {
      // Streak broken
      newStreak = 1;
    }
  }

  await prisma.learningStats.update({
    where: { userId },
    data: {
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, stats.longestStreak),
      lastActiveDate: now
    }
  });

  // Check for streak achievements
  if (newStreak >= 7) {
    await awardAchievement(userId, ACHIEVEMENTS.WEEK_STREAK);
  }
}

async function awardAchievement(userId: string, achievement: typeof ACHIEVEMENTS[keyof typeof ACHIEVEMENTS]): Promise<void> {
  // Check if already awarded
  const existing = await prisma.userAchievement.findFirst({
    where: {
      userId,
      badgeId: achievement.id
    }
  });

  if (existing) return;

  await prisma.userAchievement.create({
    data: {
      userId,
      badgeId: achievement.id,
      badgeName: achievement.name,
      badgeIcon: achievement.icon,
      description: achievement.description
    }
  });

  await prisma.learningStats.update({
    where: { userId },
    data: {
      badgeCount: { increment: 1 },
      totalXP: { increment: 200 } // Bonus XP for achievement
    }
  });
}

async function addXP(userId: string, xp: number): Promise<void> {
  const stats = await prisma.learningStats.findUnique({
    where: { userId }
  });

  if (!stats) return;

  const newXP = stats.totalXP + xp;
  const newLevel = calculateLevel(newXP);

  await prisma.learningStats.update({
    where: { userId },
    data: {
      totalXP: newXP,
      level: newLevel,
      totalPoints: { increment: xp }
    }
  });
}

// ==========================================
// API ENDPOINTS
// ==========================================

export async function POST(req: NextRequest) {
  try {
    const { action, userId, data } = await req.json();

    switch (action) {
      case 'start_milestone':
        return await startMilestone(userId, data.milestoneId);
      
      case 'complete_milestone':
        return await completeMilestone(userId, data.milestoneId);
      
      case 'submit_quiz':
        return await submitQuiz(userId, data.quizId, data.selectedIndex);
      
      case 'mark_resource_viewed':
        return await markResourceViewed(userId, data.milestoneId, data.resourceId);
      
      case 'update_daily_progress':
        return await updateDailyProgress(userId, data.minsSpent);
      
      case 'get_stats':
        return await getStats(userId);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (e: any) {
    console.error("Progress API error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ==========================================
// START MILESTONE
// ==========================================
async function startMilestone(userId: string, milestoneId: string) {
  await updateStreak(userId);
  
  const progress = await prisma.milestoneProgress.upsert({
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

  await addXP(userId, calculateXP('milestone_start'));

  return NextResponse.json({ success: true, progress });
}

// ==========================================
// COMPLETE MILESTONE
// ==========================================
async function completeMilestone(userId: string, milestoneId: string) {
  const progress = await prisma.milestoneProgress.findUnique({
    where: {
      userId_milestoneId: { userId, milestoneId }
    }
  });

  if (!progress) {
    return NextResponse.json({ error: 'Progress not found' }, { status: 404 });
  }

  // Calculate time spent
  const startedAt = progress.startedAt || new Date();
  const completedAt = new Date();
  const timeSpentMs = completedAt.getTime() - startedAt.getTime();
  const timeSpentMins = Math.floor(timeSpentMs / 60000);

  // Update progress
  await prisma.milestoneProgress.update({
    where: {
      userId_milestoneId: { userId, milestoneId }
    },
    data: {
      status: 'completed',
      completedAt,
      timeSpentMins: timeSpentMins
    }
  });

  // Update stats
  await prisma.learningStats.update({
    where: { userId },
    data: {
      milestonesCompleted: { increment: 1 },
      totalTimeSpentMins: { increment: timeSpentMins }
    }
  });

  await addXP(userId, calculateXP('milestone_complete'));

  // Check achievements
  const stats = await prisma.learningStats.findUnique({
    where: { userId }
  });

  if (stats) {
    if (stats.milestonesCompleted === 1) {
      await awardAchievement(userId, ACHIEVEMENTS.FIRST_MILESTONE);
    }
    
    if (stats.totalTimeSpentMins >= 600) { // 10 hours
      await awardAchievement(userId, ACHIEVEMENTS.DEDICATED);
    }
    
    // Speed learner (completed in under 3 days)
    if (timeSpentMins < 4320) { // 72 hours
      await awardAchievement(userId, ACHIEVEMENTS.SPEED_LEARNER);
    }
  }

  // Check if roadmap is complete
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: { roadmap: true }
  });

  if (milestone) {
    const allMilestones = await prisma.milestone.findMany({
      where: { roadmapId: milestone.roadmapId }
    });

    const allProgress = await prisma.milestoneProgress.findMany({
      where: {
        userId,
        milestoneId: { in: allMilestones.map(m => m.id) }
      }
    });

    const allCompleted = allProgress.every(p => p.status === 'completed');

    if (allCompleted) {
      await prisma.roadmap.update({
        where: { id: milestone.roadmapId },
        data: {
          isCompleted: true,
          completedAt: new Date()
        }
      });

      await awardAchievement(userId, ACHIEVEMENTS.ROADMAP_COMPLETE);
    }
  }

  return NextResponse.json({ success: true, timeSpentMins });
}

// ==========================================
// SUBMIT QUIZ
// ==========================================
async function submitQuiz(userId: string, quizId: string, selectedIndex: number) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId }
  });

  if (!quiz) {
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
  }

  const isCorrect = selectedIndex === quiz.correctIndex;

  // Record attempt
  await prisma.quizAttempt.create({
    data: {
      userId,
      quizId,
      selectedIndex,
      isCorrect
    }
  });

  // Update stats
  if (isCorrect) {
    await prisma.learningStats.update({
      where: { userId },
      data: {
        quizzesPassed: { increment: 1 }
      }
    });

    await addXP(userId, calculateXP('quiz_pass'));

    // Check quiz master achievement
    const stats = await prisma.learningStats.findUnique({
      where: { userId }
    });

    if (stats && stats.quizzesPassed >= 10) {
      await awardAchievement(userId, ACHIEVEMENTS.QUIZ_MASTER);
    }
  } else {
    await addXP(userId, calculateXP('quiz_fail'));
  }

  // Update daily goal
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  await prisma.dailyGoal.upsert({
    where: {
      userId_date: { userId, date: today }
    },
    update: {
      quizzesSolved: { increment: 1 }
    },
    create: {
      userId,
      date: today,
      quizzesSolved: 1
    }
  });

  return NextResponse.json({ 
    success: true, 
    isCorrect,
    correctIndex: quiz.correctIndex,
    explanation: quiz.explanation
  });
}

// ==========================================
// MARK RESOURCE VIEWED
// ==========================================
async function markResourceViewed(userId: string, milestoneId: string, resourceId: string) {
  const progress = await prisma.milestoneProgress.findUnique({
    where: {
      userId_milestoneId: { userId, milestoneId }
    }
  });

  if (!progress) {
    return NextResponse.json({ error: 'Progress not found' }, { status: 404 });
  }

  const viewedResources = progress.resourcesViewed || [];
  if (!viewedResources.includes(resourceId)) {
    await prisma.milestoneProgress.update({
      where: {
        userId_milestoneId: { userId, milestoneId }
      },
      data: {
        resourcesViewed: [...viewedResources, resourceId]
      }
    });

    await addXP(userId, calculateXP('resource_view'));
  }

  return NextResponse.json({ success: true });
}

// ==========================================
// UPDATE DAILY PROGRESS
// ==========================================
async function updateDailyProgress(userId: string, minsSpent: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await updateStreak(userId);

  const goal = await prisma.dailyGoal.upsert({
    where: {
      userId_date: { userId, date: today }
    },
    update: {
      minsCompleted: { increment: minsSpent }
    },
    create: {
      userId,
      date: today,
      minsCompleted: minsSpent
    }
  });

  // Check if daily goal is met
  const isCompleted = goal.minsCompleted >= goal.targetMins && 
                      goal.quizzesSolved >= goal.targetQuizzes;

  if (isCompleted && !goal.isCompleted) {
    await prisma.dailyGoal.update({
      where: {
        userId_date: { userId, date: today }
      },
      data: {
        isCompleted: true
      }
    });

    await addXP(userId, calculateXP('daily_goal'));
  }

  return NextResponse.json({ success: true, goal });
}

// ==========================================
// GET STATS
// ==========================================
async function getStats(userId: string) {
  const stats = await prisma.learningStats.findUnique({
    where: { userId }
  });

  const achievements = await prisma.userAchievement.findMany({
    where: { userId },
    orderBy: { earnedAt: 'desc' }
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dailyGoal = await prisma.dailyGoal.findUnique({
    where: {
      userId_date: { userId, date: today }
    }
  });

  return NextResponse.json({
    stats: stats || {
      totalXP: 0,
      level: 1,
      currentStreak: 0,
      longestStreak: 0,
      milestonesCompleted: 0,
      quizzesPassed: 0,
      totalTimeSpentMins: 0,
      badgeCount: 0
    },
    achievements,
    dailyGoal: dailyGoal || {
      targetMins: 30,
      targetQuizzes: 3,
      minsCompleted: 0,
      quizzesSolved: 0,
      isCompleted: false
    }
  });
}