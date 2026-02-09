"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FilterOption {
  id: string;
  name: string;
}

interface FilterSelectProps {
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: FilterOption[];
  placeholder?: string;
  width?: string;
}

export function FilterSelect({
  label,
  value,
  onValueChange,
  options,
  placeholder = "All",
  width = "w-[120px]"
}: FilterSelectProps) {
  return (
    <div className="flex items-center gap-2">
      {label && (
        <span className="text-sm text-muted-foreground">{label}</span>
      )}
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={`${width} h-9 rounded-lg border-primary/20 focus:ring-primary/20 focus:border-primary/40`}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map(option => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
