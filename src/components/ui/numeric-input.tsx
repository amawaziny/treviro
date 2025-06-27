"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

// Format number with thousand separators
const formatNumber = (value: string): string => {
  if (!value) return "";
  
  // Remove all non-numeric characters except decimal point
  const numericValue = value.replace(/[^0-9.]/g, '');
  
  // Split into integer and decimal parts
  const parts = numericValue.split('.');
  let integerPart = parts[0] || '0';
  
  // Add thousand separators to integer part
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  // Handle decimal part if present
  if (parts.length > 1) {
    const decimalPart = parts[1].slice(0, 3); // Limit to 3 decimal places
    return `${formattedInteger}.${decimalPart}`;
  }
  
  return formattedInteger;
};

// Convert display value back to raw number string
const parseNumber = (displayValue: string): string => {
  if (!displayValue) return "";
  // Remove thousand separators and return as string
  return displayValue.replace(/,/g, '');
};

interface NumericInputProps extends Omit<InputProps, 'onChange' | 'value' | 'defaultValue' | 'min' | 'max'> {
  value?: string | number;
  onChange?: (value: string) => void;
  allowDecimal?: boolean;
  min?: number;
  max?: number;
}

const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  ({ value, onChange, className, allowDecimal = true, min, max, ...props }, ref) => {
    // Use the forwarded ref directly
    const inputRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const displayValue = input.value;
      
      // Convert display value to raw numeric string
      let numericString = parseNumber(displayValue);
      let numericValue = numericString ? parseFloat(numericString) : 0;
      
      // Apply min/max constraints
      if (min !== undefined && numericValue < min) {
        numericValue = min;
        numericString = numericValue.toString();
      }
      if (max !== undefined && numericValue > max) {
        numericValue = max;
        numericString = numericValue.toString();
      }
      
      // Call the parent's onChange with the constrained numeric string if provided
      if (onChange) {
        onChange(numericString);
      }
      
      // Format the display value
      const formattedValue = formatNumber(numericString);
      
      // Update the input value with formatted display
      if (inputRef.current) {
        const cursorPosition = input.selectionStart || 0;
        inputRef.current.value = formattedValue;
        
        // Try to maintain cursor position
        setTimeout(() => {
          if (inputRef.current) {
            let newPosition = cursorPosition + (formattedValue.length - displayValue.length);
            newPosition = Math.max(0, Math.min(newPosition, formattedValue.length));
            inputRef.current.setSelectionRange(newPosition, newPosition);
          }
        }, 0);
      }
    };

    // Format the initial display value
    const displayValue = React.useMemo(() => {
      if (value === undefined || value === null) return "";
      return formatNumber(String(value));
    }, [value]);

    return (
      <Input
        ref={inputRef}
        type="text"
        inputMode={allowDecimal ? "decimal" : "numeric"}
        value={displayValue}
        onChange={handleChange}
        className={cn("text-right", className)}
        {...props}
      />
    );
  }
);

NumericInput.displayName = 'NumericInput';

export { NumericInput };
