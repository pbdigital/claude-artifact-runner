import { UserChallengeProgress, TaskTemplate } from '../types/challenge';

export const startChallenge = (userId: string, challengeId: string, levelId: string): UserChallengeProgress => {
  return {
    id: Math.random().toString(36).substr(2, 9), // In production, use a proper ID generator
    user_id: userId,
    challenge_id: challengeId,
    level_id: levelId,
    start_date: new Date(),
    current_day: 1,
    task_completions: {}
  };
};

export const getUserDayTasks = (
  progress: UserChallengeProgress | undefined, 
  taskTemplates: TaskTemplate[],
  day?: number
) => {
  if (!progress) return [];
  
  const targetDay = day || progress.current_day;
  const currentWeek = Math.ceil(targetDay / 7);
  const weekStartDay = (currentWeek - 1) * 7 + 1;
  
  // Get daily tasks for the current day
  const dailyTasks = taskTemplates.filter(template => 
    template.schedule.type === 'daily' && 
    template.schedule.occurrences.includes(targetDay)
  ).map(template => ({
    ...template,
    completed: progress.task_completions[targetDay]?.[template.id]?.completed ?? false,
    completedAt: progress.task_completions[targetDay]?.[template.id]?.completed_at,
    notes: progress.task_completions[targetDay]?.[template.id]?.notes
  }));

  // Get weekly tasks (current week)
  const weeklyTasks = taskTemplates.filter(template =>
    template.schedule.type === 'weekly' &&
    template.schedule.occurrences.includes(currentWeek)
  ).map(template => {
    // Check if the task was completed on any day of the current week
    const isCompletedThisWeek = Array.from({ length: 7 }, (_, i) => weekStartDay + i)
      .some(weekDay => 
        weekDay <= targetDay && // Only check up to current day
        progress.task_completions[weekDay]?.[template.id]?.completed
      );
    
    // Find the completion details from the day it was completed (if it was)
    const completionDay = Array.from({ length: 7 }, (_, i) => weekStartDay + i)
      .find(weekDay => 
        weekDay <= targetDay &&
        progress.task_completions[weekDay]?.[template.id]?.completed
      );

    return {
      ...template,
      completed: isCompletedThisWeek,
      completedAt: completionDay ? progress.task_completions[completionDay][template.id].completed_at : undefined,
      notes: completionDay ? progress.task_completions[completionDay][template.id].notes : undefined
    };
  });

  // Get monthly tasks (if any, since it's a 28-day challenge)
  const monthlyTasks = taskTemplates.filter(template =>
    template.schedule.type === 'monthly' &&
    template.schedule.occurrences.includes(1)
  ).map(template => {
    // Check if the task was completed on any previous day
    const isCompletedThisMonth = Array.from({ length: targetDay }, (_, i) => i + 1)
      .some(day => progress.task_completions[day]?.[template.id]?.completed);
    
    // Find the completion details from the day it was completed (if it was)
    const completionDay = Array.from({ length: targetDay }, (_, i) => i + 1)
      .find(day => progress.task_completions[day]?.[template.id]?.completed);

    return {
      ...template,
      completed: isCompletedThisMonth,
      completedAt: completionDay ? progress.task_completions[completionDay][template.id].completed_at : undefined,
      notes: completionDay ? progress.task_completions[completionDay][template.id].notes : undefined
    };
  });

  return [...dailyTasks, ...weeklyTasks, ...monthlyTasks];
};

export const completeTask = (
  progress: UserChallengeProgress, 
  taskTemplateId: string,
  notes?: string
): UserChallengeProgress => {
  if (!progress) return startChallenge('', '', ''); // This should never happen if properly typed
  
  return {
    ...progress,
    task_completions: {
      ...progress.task_completions,
      [progress.current_day]: {
        ...progress.task_completions[progress.current_day],
        [taskTemplateId]: {
          completed: true,
          completed_at: new Date(),
          notes
        }
      }
    }
  };
};

export const uncompleteTask = (
  progress: UserChallengeProgress, 
  taskTemplateId: string
): UserChallengeProgress => {
  if (!progress) return startChallenge('', '', ''); // This should never happen if properly typed
  
  const dayCompletions = progress.task_completions[progress.current_day] || {};
  const { [taskTemplateId]: _, ...remainingTasks } = dayCompletions;
  
  return {
    ...progress,
    task_completions: {
      ...progress.task_completions,
      [progress.current_day]: remainingTasks
    }
  };
};

export const advanceDay = (progress: UserChallengeProgress): UserChallengeProgress => {
  if (!progress || progress.current_day >= 28) return progress;
  
  return {
    ...progress,
    current_day: progress.current_day + 1
  };
};

export const getCompletionRate = (
  progress: UserChallengeProgress | undefined, 
  taskTemplates: TaskTemplate[]
): number => {
  if (!progress) return 0;
  
  let totalTasks = 0;
  let completedTasks = 0;

  const currentDay = progress.current_day || 1;

  for (let day = 1; day <= currentDay; day++) {
    const dayTasks = getUserDayTasks(progress, taskTemplates, day);
    totalTasks += dayTasks.length;
    completedTasks += dayTasks.filter(task => 
      progress.task_completions[day]?.[task.id]?.completed
    ).length;
  }

  return totalTasks === 0 ? 0 : completedTasks / totalTasks;
}; 