import Spinner from '@/components/ui/Spinner';
import { STRINGS } from '@/constants/strings';

interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({ message = STRINGS.states.loading }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <Spinner size={32} />
      <p className="text-sm text-[#475569]">{message}</p>
    </div>
  );
}
