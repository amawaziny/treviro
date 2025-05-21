
"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// We need to define InputProps if it's not directly exportable from '@/components/ui/input'
// For now, let's assume a basic set of props. If Input has more specific props we need,
// we might need to adjust this.
interface CustomInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

interface NumericInputProps extends Omit<CustomInputProps, 'value' | 'onChange' | 'type'> {
  value: string | undefined; // The controlled value (string representation of number or undefined for empty)
  onChange: (value: string | undefined) => void; // Callback to update the parent state
}

const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  ({ value, onChange, className, ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const rawStringValue = event.target.value;
      const decimalRegex = /^\d*\.?\d*$/;

      if (rawStringValue === '') {
        onChange(undefined);
      } else if (decimalRegex.test(rawStringValue)) {
        onChange(rawStringValue);
      }
      // If not empty and not matching regex, do nothing, effectively preventing invalid input.
      // The input's value remains what it was before the invalid character was typed by the browser.
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={value ?? ''} // Ensure input always gets a string
        onChange={handleChange}
        className={cn(className)}
        {...props}
      />
    );
  }
);
NumericInput.displayName = 'NumericInput';

export { NumericInput };
