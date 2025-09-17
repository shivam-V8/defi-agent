'use client';

import { Input } from '@/components/ui/input';

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function AmountInput({ value, onChange, placeholder = "0", className }: AmountInputProps) {
  return (
    <div className="relative">
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
      />
    </div>
  );
}