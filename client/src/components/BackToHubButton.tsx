import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BackToHubButtonProps {
  hubPath: string;
  label?: string;
}

export function BackToHubButton({ hubPath, label = 'Back to Hub' }: BackToHubButtonProps) {
  const navigate = useNavigate();
  return (
    <Button variant="outline" size="sm" onClick={() => navigate(hubPath)}>
      <ArrowLeft size={14} className="me-1" />
      {label}
    </Button>
  );
}
