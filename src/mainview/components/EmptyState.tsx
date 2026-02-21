interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      {icon && <div className="mb-4 text-4xl">{icon}</div>}
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">{message}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="px-4 py-2 rounded-md border border-border bg-background text-sm font-medium text-foreground transition-colors hover:bg-accent focus:outline-none"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

