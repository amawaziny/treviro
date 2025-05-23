
"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CustomInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

interface NumericInputProps extends Omit<CustomInputProps, 'value' | 'onChange' | 'type'> {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  allowDecimal?: boolean; // New prop
}

const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  ({ value, onChange, className, allowDecimal = true, ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const rawStringValue = event.target.value;
      const decimalRegex = /^\d*\.?\d*$/;
      const integerRegex = /^\d*$/;
      const regexToUse = allowDecimal ? decimalRegex : integerRegex;

      if (rawStringValue === '') {
        onChange(undefined);
      } else if (regexToUse.test(rawStringValue)) {
        onChange(rawStringValue);
      }
      // If not empty and not matching regex, do nothing, effectively preventing invalid input.
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode={allowDecimal ? "decimal" : "numeric"}
        value={value ?? ''}
        onChange={handleChange}
        className={cn(className)}
        {...props}
      />
    );
  }
);
NumericInput.displayName = 'NumericInput';

export { NumericInput };
