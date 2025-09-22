import { Badge } from '@/components/ui/badge';

interface LeadStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function LeadStatusBadge({ status, size = 'md' }: LeadStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new':
        return {
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 hover:bg-green-100'
        };
      case 'contacted':
        return {
          variant: 'secondary' as const,
          className: 'bg-blue-100 text-blue-800 hover:bg-blue-100'
        };
      case 'qualified':
        return {
          variant: 'outline' as const,
          className: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100'
        };
      case 'converted':
        return {
          variant: 'destructive' as const,
          className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
        };
      case 'lost':
        return {
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 hover:bg-red-100'
        };
      default:
        return {
          variant: 'secondary' as const,
          className: 'bg-gray-100 text-gray-800 hover:bg-gray-100'
        };
    }
  };

  const getSizeClass = (size: string) => {
    switch (size) {
      case 'sm':
        return 'text-xs px-2 py-1';
      case 'lg':
        return 'text-sm px-3 py-1.5';
      default:
        return 'text-xs px-2.5 py-1';
    }
  };

  const statusConfig = getStatusConfig(status);
  const sizeClass = getSizeClass(size);

  return (
    <Badge 
      variant={statusConfig.variant}
      className={`${statusConfig.className} ${sizeClass} font-medium`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
