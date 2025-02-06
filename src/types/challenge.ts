export interface TaskContent {
  content: string; // JSON string of rich text content
  media_url?: string;
  duration?: number;
}

export interface TaskTemplate {
  id: string;
  name: string;
  details: string;
  content: TaskContent;
  schedule: {
    type: 'daily' | 'weekly' | 'monthly';
    occurrences: number[];
  };
  level_id: string;
}

export interface Level {
  id: string;
  challenge_id: string;
  name: string;
  description: string;
  icon: string;
  required_completion_rate: number;
  next_level_id?: string;
  prerequisites?: string[];
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  duration_days: number;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  thumbnail_url?: string;
}

export interface UserChallengeProgress {
  id: string;
  user_id: string;
  challenge_id: string;
  level_id: string;
  start_date: Date;
  current_day: number;
  task_completions: {
    [day: number]: {
      [task_template_id: string]: {
        completed: boolean;
        completed_at?: Date;
        notes?: string;
      }
    }
  }
}

export interface NewTaskTemplate {
  name: string;
  details: string;
  content: TaskContent;
  schedule: {
    type: 'daily' | 'weekly' | 'monthly';
    occurrences: number[];
  };
} 