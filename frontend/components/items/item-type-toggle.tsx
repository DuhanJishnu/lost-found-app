import { Button } from "@/components/ui/button";

import { ItemType } from "@/types/items";

const options: { value: ItemType; label: string }[] = [
  { value: "LOST", label: "I lost something" },
  { value: "FOUND", label: "I found something" },
];

interface ItemTypeToggleProps {
  value: ItemType;
  onChange: (value: ItemType) => void;
}

export function ItemTypeToggle({ value, onChange }: ItemTypeToggleProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant={value === option.value ? "default" : "outline"}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
