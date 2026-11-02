'use client';

export interface BadgeProps {
  variant: 'category' | 'level' | 'status';
  value: string;
  label?: string;
}

export function Badge({ variant, value, label }: BadgeProps) {
  const getBadgeStyles = () => {
    switch (variant) {
      case 'category':
        return 'bg-category-bg text-category-text';
      case 'level':
        if (value === 'Beginner') return 'bg-success-bg text-success-text';
        if (value === 'Intermediate') return 'bg-warning-bg text-warning-text';
        if (value === 'Advanced') return 'bg-danger-bg text-danger-text';
        return 'bg-surface-1 text-text-secondary';
      case 'status':
        if (value === 'learned' || value === 'Learned')
          return 'bg-success-bg text-success-text';
        if (value === 'review_due' || value === 'Review due')
          return 'bg-warning-bg text-warning-text';
        if (value === 'in_progress' || value === 'In progress')
          return 'bg-accent-bg text-accent-text';
        return 'bg-surface-1 text-text-secondary';
      default:
        return 'bg-surface-1 text-text-secondary';
    }
  };

  return (
    <span className={`badge ${getBadgeStyles()}`}>
      {label ?? (value === 'in_progress' ? 'In progress' : value === 'review_due' ? 'Review due' : value === 'learned' ? 'Learned' : value === 'new' ? 'New' : value)}
    </span>
  );
}
