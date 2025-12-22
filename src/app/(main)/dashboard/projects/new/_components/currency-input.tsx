"use client";

import { Input } from "@/components/ui/input";

interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function CurrencyInput({ value, onChange }: CurrencyInputProps) {
  const formatValue = (rawValue: string) => {
    // Remove all non-digit characters
    const digits = rawValue.replace(/\D/g, "");
    
    // Format with commas
    if (digits) {
      return Number(digits).toLocaleString("en-AU");
    }
    return "";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    // Store raw digits only
    const digits = rawValue.replace(/\D/g, "");
    onChange(digits);
  };

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
      <Input
        type="text"
        className="pl-7"
        placeholder="0"
        value={formatValue(value)}
        onChange={handleChange}
      />
    </div>
  );
}


