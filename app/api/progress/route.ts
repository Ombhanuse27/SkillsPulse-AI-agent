// FILE: app/api/progress/route.ts
//
// ─── PRISMA SCHEMA REQUIRED ──────────────────────────────────────────────────
// Your MilestoneProgress model needs this field (run `prisma migrate dev`):
//
//   model MilestoneProgress {
//     ...existing fields...
//     testResult  Json?
//   }
//
// ─── ROADMAP LOADING QUERY — CRITICAL ────────────────────────────────────────
// In whatever thunk/API loads roadmaps (e.g. loadRoadmaps), your Prisma
// include MUST select testResult or it will always be null in the UI:
//
//   progress: {
//     where: { userId },
//     select: {
//       status: true,
//       startedAt: true,
//       completedAt: true,
//       resourcesViewed: true,
//       testResult: true,   // <── THIS LINE IS REQUIRED
//     }
//   }
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ==========================================
// ACHIEVEMENT DEFINITIONS
// ==========================================
const ACHIEVEMENTS = {
  FIRST_MILESTONE: { id: 'first_milestone', name: 'Getting Started', icon: '🎯', description: 'Complete your first milestone' },
  QUIZ_MASTER:     { id: 'quiz_master',     name: 'Quiz Master',     icon: '🧠', description: 'Pass 10 quizzes' },
  WEEK_STREAK:     { id: 'week_streak',     name: 'Week Warrior',    icon: '🔥', description: 'Maintain a 7-day streak' },
  SPEED_LEARNER:   { id: 'speed_learner',   name: 'Speed Learner',   icon: '⚡', description: 'Complete a milestone in under 3 days' },
  DEDICATED:       { id: 'dedicated',       name: 'Dedicated Learner', icon: '💎', description: 'Study for 10 hours total' },
  ROADMAP_COMPLETE:{ id: 'roadmap_complete',name: 'Mission Complete', icon: '🏆', description: 'Complete an entire roadmap' },
  PERFECT_TEST:    { id: 'perfect_test',    name: 'Perfect Score',   icon: '⭐', description: 'Score 100% on a milestone test' },
  TEST_CHAMPION:   { id: 'test_champion',   name: 'Test Champion',   icon: '🎓', description: 'Pass 5 milestone tests' },
  COMEBACK_KID:    { id: 'comeback_kid',    name: 'Comeback Kid',    icon: '💪', description: 'Retry a failed test and pass it' },
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
    'streak_day': 15,
    'test_perfect': 100,
    'test_excellent': 75,
    'test_good': 50,
    'test_poor': 25,
    'test_fail': 10,
    'test_retry_perfect': 50,
    'test_retry_excellent': 37,
    'test_retry_good': 25,
    'test_retry_poor': 12,
    'test_retry_fail': 5,
  };
  return xpTable[action] || 0;
}

function calculateLevel(totalXP: number): number {
  return Math.floor(Math.sqrt(totalXP / 100)) + 1;
}

// ==========================================
// GRADE HELPERS
// ==========================================
function getGrade(ratio: number): string {
  if (ratio === 1)    return 'S';
  if (ratio >= 0.8)   return 'A';
  if (ratio >= 0.6)   return 'B';
  if (ratio >= 0.4)   return 'C';
  return 'F';
}

function isPassing(grade: string): boolean {
  return ['S', 'A', 'B'].includes(grade);
}

function xpActionForRatio(ratio: number, isRetry: boolean): string {
  const prefix = isRetry ? 'test_retry_' : 'test_';
  if (ratio === 1)    return `${prefix}perfect`;
  if (ratio >= 0.8)   return `${prefix}excellent`;
  if (ratio >= 0.6)   return `${prefix}good`;
  if (ratio >= 0.4)   return `${prefix}poor`;
  return `${prefix}fail`;
}

// ==========================================
// GAMIFICATION HELPERS
// ==========================================
async function updateStreak(userId: string): Promise<void> {
  const stats = await prisma.learningStats.findUnique({ where: { userId } });
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
    if (daysDiff === 0) return;
    else if (daysDiff === 1) newStreak = stats.currentStreak + 1;
    else newStreak = 1;
  }

  await prisma.learningStats.update({
    where: { userId },
    data: { currentStreak: newStreak, longestStreak: Math.max(newStreak, stats.longestStreak), lastActiveDate: now }
  });

  if (newStreak >= 7) await awardAchievement(userId, ACHIEVEMENTS.WEEK_STREAK);
}

async function awardAchievement(userId: string, achievement: typeof ACHIEVEMENTS[keyof typeof ACHIEVEMENTS]): Promise<void> {
  const existing = await prisma.userAchievement.findFirst({ where: { userId, badgeId: achievement.id } });
  if (existing) return;

  await prisma.userAchievement.create({
    data: { userId, badgeId: achievement.id, badgeName: achievement.name, badgeIcon: achievement.icon, description: achievement.description }
  });

  await prisma.learningStats.update({
    where: { userId },
    data: { badgeCount: { increment: 1 }, totalXP: { increment: 200 } }
  });
}

async function addXP(userId: string, xp: number): Promise<void> {
  const stats = await prisma.learningStats.findUnique({ where: { userId } });
  if (!stats) return;
  const newXP = stats.totalXP + xp;
  await prisma.learningStats.update({
    where: { userId },
    data: { totalXP: newXP, level: calculateLevel(newXP), totalPoints: { increment: xp } }
  });
}

// ==========================================
// API ROUTER
// ==========================================
export async function POST(req: NextRequest) {
  try {
    const { action, userId, data } = await req.json();

    switch (action) {
      case 'start_milestone':        return await startMilestone(userId, data.milestoneId);
      case 'complete_milestone':     return await completeMilestone(userId, data.milestoneId);
      case 'submit_quiz':            return await submitQuiz(userId, data.quizId, data.selectedIndex);
      case 'mark_resource_viewed':   return await markResourceViewed(userId, data.milestoneId, data.resourceId);
      case 'update_daily_progress':  return await updateDailyProgress(userId, data.minsSpent);
      case 'get_stats':              return await getStats(userId);
      case 'submit_quiz_manual':     return await submitQuizManual(userId, data.xp ?? 25);
      case 'deduct_xp':              return await deductXP(userId, data.amount ?? 100);
      case 'submit_test':            return await submitTest(userId, data.milestoneId, data.milestoneTitle, data.score, data.total, data.answers);
      default:                       return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (e: any) {
    console.error('Progress API error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ==========================================
// MILESTONE HANDLERS
// ==========================================
async function startMilestone(userId: string, milestoneId: string) {
  await updateStreak(userId);
  const progress = await prisma.milestoneProgress.upsert({
    where: { userId_milestoneId: { userId, milestoneId } },
    update: { status: 'in_progress', startedAt: new Date() },
    create: { userId, milestoneId, status: 'in_progress', startedAt: new Date() }
  });
  await addXP(userId, calculateXP('milestone_start'));
  return NextResponse.json({ success: true, progress });
}

async function completeMilestone(userId: string, milestoneId: string) {
  const progress = await prisma.milestoneProgress.findUnique({ where: { userId_milestoneId: { userId, milestoneId } } });
  if (!progress) return NextResponse.json({ error: 'Progress not found' }, { status: 404 });

  const startedAt = progress.startedAt || new Date();
  const completedAt = new Date();
  const timeSpentMins = Math.floor((completedAt.getTime() - startedAt.getTime()) / 60000);

  await prisma.milestoneProgress.update({
    where: { userId_milestoneId: { userId, milestoneId } },
    data: { status: 'completed', completedAt, timeSpentMins }
  });

  await prisma.learningStats.update({
    where: { userId },
    data: { milestonesCompleted: { increment: 1 }, totalTimeSpentMins: { increment: timeSpentMins } }
  });

  await addXP(userId, calculateXP('milestone_complete'));

  const stats = await prisma.learningStats.findUnique({ where: { userId } });
  if (stats) {
    if (stats.milestonesCompleted === 1) await awardAchievement(userId, ACHIEVEMENTS.FIRST_MILESTONE);
    if (stats.totalTimeSpentMins >= 600) await awardAchievement(userId, ACHIEVEMENTS.DEDICATED);
    if (timeSpentMins < 4320) await awardAchievement(userId, ACHIEVEMENTS.SPEED_LEARNER);
  }

  const milestone = await prisma.milestone.findUnique({ where: { id: milestoneId }, include: { roadmap: true } });
  if (milestone) {
    const allMilestones = await prisma.milestone.findMany({ where: { roadmapId: milestone.roadmapId } });
    const allProgress = await prisma.milestoneProgress.findMany({
      where: { userId, milestoneId: { in: allMilestones.map(m => m.id) } }
    });
    if (allProgress.every(p => p.status === 'completed')) {
      await prisma.roadmap.update({ where: { id: milestone.roadmapId }, data: { isCompleted: true, completedAt: new Date() } });
      await awardAchievement(userId, ACHIEVEMENTS.ROADMAP_COMPLETE);
    }
  }

  return NextResponse.json({ success: true, timeSpentMins });
}

async function submitQuiz(userId: string, quizId: string, selectedIndex: number) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });

  const isCorrect = selectedIndex === quiz.correctIndex;
  await prisma.quizAttempt.create({ data: { userId, quizId, selectedIndex, isCorrect } });

  if (isCorrect) {
    await prisma.learningStats.update({ where: { userId }, data: { quizzesPassed: { increment: 1 } } });
    await addXP(userId, calculateXP('quiz_pass'));
    const stats = await prisma.learningStats.findUnique({ where: { userId } });
    if (stats && stats.quizzesPassed >= 10) await awardAchievement(userId, ACHIEVEMENTS.QUIZ_MASTER);
  } else {
    await addXP(userId, calculateXP('quiz_fail'));
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  await prisma.dailyGoal.upsert({
    where: { userId_date: { userId, date: today } },
    update: { quizzesSolved: { increment: 1 } },
    create: { userId, date: today, quizzesSolved: 1 }
  });

  return NextResponse.json({ success: true, isCorrect, correctIndex: quiz.correctIndex, explanation: quiz.explanation });
}

async function markResourceViewed(userId: string, milestoneId: string, resourceId: string) {
  const progress = await prisma.milestoneProgress.findUnique({ where: { userId_milestoneId: { userId, milestoneId } } });
  if (!progress) return NextResponse.json({ error: 'Progress not found' }, { status: 404 });

  const viewedResources = (progress.resourcesViewed as string[]) || [];
  if (!viewedResources.includes(resourceId)) {
    await prisma.milestoneProgress.update({
      where: { userId_milestoneId: { userId, milestoneId } },
      data: { resourcesViewed: [...viewedResources, resourceId] }
    });
    await addXP(userId, calculateXP('resource_view'));
  }
  return NextResponse.json({ success: true });
}

async function updateDailyProgress(userId: string, minsSpent: number) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  await updateStreak(userId);

  const goal = await prisma.dailyGoal.upsert({
    where: { userId_date: { userId, date: today } },
    update: { minsCompleted: { increment: minsSpent } },
    create: { userId, date: today, minsCompleted: minsSpent }
  });

  const isCompleted = goal.minsCompleted >= goal.targetMins && goal.quizzesSolved >= goal.targetQuizzes;
  if (isCompleted && !goal.isCompleted) {
    await prisma.dailyGoal.update({ where: { userId_date: { userId, date: today } }, data: { isCompleted: true } });
    await addXP(userId, calculateXP('daily_goal'));
  }
  return NextResponse.json({ success: true, goal });
}

async function getStats(userId: string) {
  const stats = await prisma.learningStats.findUnique({ where: { userId } });
  const achievements = await prisma.userAchievement.findMany({ where: { userId }, orderBy: { earnedAt: 'desc' } });
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dailyGoal = await prisma.dailyGoal.findUnique({ where: { userId_date: { userId, date: today } } });

  return NextResponse.json({
    stats: stats || { totalXP: 0, level: 1, currentStreak: 0, longestStreak: 0, milestonesCompleted: 0, quizzesPassed: 0, totalTimeSpentMins: 0, badgeCount: 0 },
    achievements,
    dailyGoal: dailyGoal || { targetMins: 30, targetQuizzes: 3, minsCompleted: 0, quizzesSolved: 0, isCompleted: false }
  });
}

async function submitQuizManual(userId: string, xp: number) {
  await addXP(userId, xp);
  const stats = await prisma.learningStats.findUnique({ where: { userId } });
  if (stats) {
    const updatedStats = await prisma.learningStats.update({ where: { userId }, data: { quizzesPassed: { increment: 1 } } });
    if (updatedStats.quizzesPassed >= 10) await awardAchievement(userId, ACHIEVEMENTS.QUIZ_MASTER);
  }
  return NextResponse.json({ success: true, xpAwarded: xp });
}

async function deductXP(userId: string, amount: number) {
  const stats = await prisma.learningStats.findUnique({ where: { userId } });
  if (!stats) return NextResponse.json({ error: 'User stats not found' }, { status: 404 });
  if (stats.totalXP < amount) return NextResponse.json({ error: 'Insufficient XP', currentXP: stats.totalXP }, { status: 402 });

  const newXP = stats.totalXP - amount;
  const updated = await prisma.learningStats.update({ where: { userId }, data: { totalXP: newXP, level: calculateLevel(newXP) } });
  return NextResponse.json({ success: true, newXP: updated.totalXP, deducted: amount });
}

// ==========================================
// SUBMIT TEST — one free attempt, retry after fail, locked after pass
// ==========================================
async function submitTest(
  userId: string,
  milestoneId: string,
  milestoneTitle: string,
  score: number,
  total: number,
  answers: { questionIndex: number; selectedIndex: number; correctIndex: number; isCorrect: boolean }[]
) {
  const ratio = score / total;
  const grade = getGrade(ratio);
  const passed = isPassing(grade);

  // ── Fetch existing progress ───────────────────────────────────────────────
  const existingProgress = await prisma.milestoneProgress.findUnique({
    where: { userId_milestoneId: { userId, milestoneId } }
  });

  const prevTestResult = existingProgress?.testResult as {
    grade: string; score: number; total: number;
    attempts: number; passed: boolean; xpEarned: number; lastAttemptAt: string;
  } | null | undefined;

  const previouslyPassed = prevTestResult ? isPassing(prevTestResult.grade) : false;

  // ── HARD BLOCK: never allow re-submission after a passing grade ───────────
  if (previouslyPassed) {
    return NextResponse.json(
      { error: 'Test already passed — no further attempts allowed.' },
      { status: 403 }
    );
  }

  const isRetry = !!prevTestResult;
  const attempts = (prevTestResult?.attempts ?? 0) + 1;

  // ── Award XP ──────────────────────────────────────────────────────────────
  const action = xpActionForRatio(ratio, isRetry);
  const xpEarned = calculateXP(action);
  await addXP(userId, xpEarned);

  // ── Persist result ────────────────────────────────────────────────────────
  const testResultData = {
    grade, score, total, attempts, passed, xpEarned,
    lastAttemptAt: new Date().toISOString(),
  };

  await prisma.milestoneProgress.upsert({
    where: { userId_milestoneId: { userId, milestoneId } },
    update: { testResult: testResultData as any },
    create: { userId, milestoneId, status: 'not_started', testResult: testResultData as any }
  });

  // ── Daily goal tracking ───────────────────────────────────────────────────
  const today = new Date(); today.setHours(0, 0, 0, 0);
  await prisma.dailyGoal.upsert({
    where: { userId_date: { userId, date: today } },
    update: { quizzesSolved: { increment: score } },
    create: { userId, date: today, quizzesSolved: score }
  });

  if (score > 0) {
    await prisma.learningStats.update({ where: { userId }, data: { quizzesPassed: { increment: score } } });
  }

  // ── Achievements ──────────────────────────────────────────────────────────
  const stats = await prisma.learningStats.findUnique({ where: { userId } });
  if (stats) {
    if (ratio === 1)                             await awardAchievement(userId, ACHIEVEMENTS.PERFECT_TEST);
    if (stats.quizzesPassed >= 10)               await awardAchievement(userId, ACHIEVEMENTS.QUIZ_MASTER);
    if (stats.quizzesPassed >= 15 && score >= 3) await awardAchievement(userId, ACHIEVEMENTS.TEST_CHAMPION);
    if (isRetry && passed)                        await awardAchievement(userId, ACHIEVEMENTS.COMEBACK_KID);
  }

  return NextResponse.json({ success: true, xpEarned, score, total, grade, passed, attempts, isRetry });
}