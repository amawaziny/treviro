"use client";

import React, { useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const formatNumber = (value: string): string => {
  if (!value) return "";
  
  // Check if the value is ending with a dot (user is typing a decimal)
  const isTypingDecimal = value.endsWith('.');
  
  // Remove all non-digit and non-dot characters, but keep at most one dot
  let numericValue = '';
  let hasDot = false;
  
  for (const char of value) {
    if (/^\d$/.test(char)) {
      numericValue += char;
    } else if (char === '.' && !hasDot) {
      numericValue += char;
      hasDot = true;
    }
  }
  
  // Split into integer and decimal parts
  const parts = numericValue.split('.');
  let integerPart = parts[0] || '';
  let decimalPart = parts.length > 1 ? parts[1].slice(0, 3) : ''; // Limit to 3 decimal places
  
  // Add thousands separators to integer part
  if (integerPart) {
    integerPart = parseInt(integerPart, 10).toLocaleString('en-US');
  }
  
  // If user is typing a decimal or we have decimal part
  if (isTypingDecimal || decimalPart) {
    return `${integerPart}.${decimalPart}`;
  }
  
  return integerPart || '';
};

// Helper to get the cursor position after formatting
const getAdjustedCursorPosition = (oldValue: string, newValue: string, cursorPos: number): number => {
  if (!oldValue || !newValue) return cursorPos;
  
  const oldNumeric = oldValue.replace(/[^0-9.]/g, '');
  const newNumeric = newValue.replace(/[^0-9.]/g, '');
  
  // Count how many non-numeric characters were added before the cursor
  const addedBeforeCursor = newValue.slice(0, cursorPos).replace(/[0-9.]/g, '').length;
  
  return cursorPos + addedBeforeCursor;
};

interface CustomInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

interface NumericInputProps
  extends Omit<CustomInputProps, "value" | "onChange" | "type"> {
  value: string | undefined; // react-hook-form field.value will be string | undefined
  onChange: (value: string) => void; // react-hook-form field.onChange, expects a string
  allowDecimal?: boolean;
}

const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  ({ value, onChange, className, allowDecimal = true, ...props }, ref) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
  const previousValue = useRef(value || '');
  const previousCursorPosition = useRef(0);

  // Update the internal ref when the value changes
  useEffect(() => {
    previousValue.current = formatNumber(value || '');
  }, [value]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const rawStringValue = input.value;
    const cursorPosition = input.selectionStart || 0;
    
    // Store the cursor position before formatting
    previousCursorPosition.current = cursorPosition;
    
    // Format the value
    const formattedValue = formatNumber(rawStringValue);
    
    // Update the input value
    if (inputRef.current) {
      inputRef.current.value = formattedValue;
      
      // Calculate and set the new cursor position
      const newCursorPosition = getAdjustedCursorPosition(
        previousValue.current,
        formattedValue,
        cursorPosition
      );
      
      // Set the cursor position after the state update
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.selectionStart = newCursorPosition;
          inputRef.current.selectionEnd = newCursorPosition;
        }
      }, 0);
    }
    
    // Update the parent component with the raw numeric value
    const numericValue = rawStringValue.replace(/[^0-9.]/g, '');
    onChange(numericValue || '');
    previousValue.current = formattedValue;
  };

    return (
      <Input
        ref={(node) => {
          // Merge refs to support both forwarded ref and our internal ref
          inputRef.current = node;
          if (node) {
            if (typeof ref === 'function') {
              ref(node);
            } else if (ref) {
              (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
            }
          }
        }}
        type="text"
        inputMode={allowDecimal ? "decimal" : "numeric"}
        value={formatNumber(value ?? "")} // Format the value for display
        onChange={handleChange}
        className={cn(className)}
        {...props}
      />
    );
  },
);
NumericInput.displayName = "NumericInput";

export { NumericInput };
