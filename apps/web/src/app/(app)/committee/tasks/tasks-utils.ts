import type { CommitteeTask, CommitteeTaskStatus } from '@tms/types';

export type BoardColumnId = 'available' | 'todo' | 'in_progress' | 'blocked' | 'done';

export const BOARD_COLUMNS: {
  id: BoardColumnId;
  label: string;
  hint: string;
}[] = [
  { id: 'available', label: 'Open pool', hint: 'Unassigned — pick up work' },
  { id: 'todo', label: 'To do', hint: 'Assigned, not started' },
  { id: 'in_progress', label: 'In progress', hint: 'Actively being worked' },
  { id: 'blocked', label: 'Blocked', hint: 'Issues or dependencies' },
  { id: 'done', label: 'Completed', hint: 'Finished work' },
];

export function boardColumnForTask(task: CommitteeTask): BoardColumnId {
  if (!task.assigneeUserId && task.status !== 'done' && task.status !== 'blocked') {
    return 'available';
  }
  if (task.status === 'done') return 'done';
  if (task.status === 'blocked') return 'blocked';
  if (task.status === 'in_progress') return 'in_progress';
  return 'todo';
}

export function groupBoardTasks(
  tasks: CommitteeTask[],
  showDone: boolean,
): Record<BoardColumnId, CommitteeTask[]> {
  const groups: Record<BoardColumnId, CommitteeTask[]> = {
    available: [],
    todo: [],
    in_progress: [],
    blocked: [],
    done: [],
  };
  for (const task of tasks) {
    const col = boardColumnForTask(task);
    if (!showDone && col === 'done') continue;
    groups[col].push(task);
  }
  return groups;
}

export const STATUS_LABELS: Record<CommitteeTaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  blocked: 'Blocked',
  done: 'Completed',
};

export function formatTaskDueDate(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function nextStatusActions(
  task: CommitteeTask,
  userId?: string,
): { status: CommitteeTaskStatus; label: string }[] {
  const isMine = task.assigneeUserId === userId;
  if (!isMine || task.status === 'done') return [];

  switch (task.status) {
    case 'todo':
      return [
        { status: 'in_progress', label: 'Start work' },
        { status: 'blocked', label: 'Flag issue' },
      ];
    case 'in_progress':
      return [
        { status: 'done', label: 'Complete' },
        { status: 'blocked', label: 'Flag issue' },
        { status: 'todo', label: 'Pause' },
      ];
    case 'blocked':
      return [
        { status: 'in_progress', label: 'Resume work' },
        { status: 'todo', label: 'Move to to do' },
      ];
    default:
      return [];
  }
}
