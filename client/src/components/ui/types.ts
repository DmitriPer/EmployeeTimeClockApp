export type StatusVariant =
  | 'pending' | 'approved' | 'rejected'
  | 'flagged' | 'corrected' | 'retroactive' | 'break-fixed'
  | 'active' | 'inactive'
  | 'role-employee' | 'role-manager' | 'role-admin'
  | 'custom';

export type StatusTone =
  | 'yellow' | 'green' | 'red' | 'amber' | 'blue'
  | 'purple' | 'teal' | 'gray';

export type ButtonVariant =
  | 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'dark';

export type ButtonSize = 'sm' | 'md' | 'lg';

export type StatusBadgeSize = 'sm' | 'md';

export type ModalSize = 'sm' | 'md' | 'lg';
