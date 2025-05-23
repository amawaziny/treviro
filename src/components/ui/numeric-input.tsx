
"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CustomInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

interface NumericInputProps extends Omit<CustomInputProps, 'value' | 'onChange' | 'type'> {
  value: string | undefined; // react-hook-form field.value will be string | undefined
  onChange: (value: string) => void; // react-hook-form field.onChange, expects a string
  allowDecimal?: boolean;
}

const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  ({ value, onChange, className, allowDecimal = true, ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const rawStringValue = event.target.value;
      const decimalRegex = /^\d*\.?\d*$/;
      const integerRegex = /^\d*$/;
      const regexToUse = allowDecimal ? decimalRegex : integerRegex;

      if (rawStringValue === '') {
        onChange(''); // Pass empty string to react-hook-form
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
        value={value ?? ''} // Display empty string if RHF value is undefined (e.g. initial)
        onChange={handleChange}
        className={cn(className)}
        {...props}
      />
    );
  }
);
NumericInput.displayName = 'NumericInput';

export { NumericInput };
