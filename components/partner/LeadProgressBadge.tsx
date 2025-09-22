import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface LeadProgressBadgeProps {
  progressStep: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function LeadProgressBadge({ progressStep, size = 'md' }: LeadProgressBadgeProps) {
  const getProgressConfig = (step: string) => {
    switch (step.toLowerCase()) {
      case 'products':
        return {
          variant: 'outline' as const,
          className: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: <Clock className="h-3 w-3 mr-1" />
        };
      case 'addons':
        return {
          variant: 'outline' as const,
          className: 'bg-purple-50 text-purple-700 border-purple-200',
          icon: <Clock className="h-3 w-3 mr-1" />
        };
      case 'checkout':
        return {
          variant: 'outline' as const,
          className: 'bg-orange-50 text-orange-700 border-orange-200',
          icon: <Clock className="h-3 w-3 mr-1" />
        };
      case 'booked':
        return {
          variant: 'secondary' as const,
          className: 'bg-green-50 text-green-700 border-green-200',
          icon: <CheckCircle className="h-3 w-3 mr-1" />
        };
      case 'paid':
      case 'payment_completed':
        return {
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800',
          icon: <CheckCircle className="h-3 w-3 mr-1" />
        };
      case 'survey':
        return {
          variant: 'outline' as const,
          className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          icon: <Clock className="h-3 w-3 mr-1" />
        };
      case 'survey_completed':
        return {
          variant: 'secondary' as const,
          className: 'bg-indigo-100 text-indigo-800',
          icon: <CheckCircle className="h-3 w-3 mr-1" />
        };
      case 'enquiry':
        return {
          variant: 'outline' as const,
          className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
          icon: <Clock className="h-3 w-3 mr-1" />
        };
      case 'enquiry_completed':
        return {
          variant: 'secondary' as const,
          className: 'bg-yellow-100 text-yellow-800',
          icon: <CheckCircle className="h-3 w-3 mr-1" />
        };
      default:
        return {
          variant: 'outline' as const,
          className: 'bg-gray-50 text-gray-700 border-gray-200',
          icon: <AlertCircle className="h-3 w-3 mr-1" />
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

  const progressConfig = getProgressConfig(progressStep);
  const sizeClass = getSizeClass(size);

  return (
    <Badge 
      variant={progressConfig.variant}
      className={`${progressConfig.className} ${sizeClass} font-medium flex items-center`}
    >
      {progressConfig.icon}
      {progressStep.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
    </Badge>
  );
}
