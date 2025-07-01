"use client";

import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@radix-ui/react-popover";

interface DateInputBaseProps {
  value?: string; // Date string in yyyy-MM-dd format
  onChange?: (date: string) => void; // Returns date in yyyy-MM-dd format
  placeholder?: string;
  disabled?: boolean;
  fromYear?: number;
  toYear?: number;
  disableFuture?: boolean;
  dateFormat?: string; // Format to display the date (e.g., 'PPP' for 'MMM dd, yyyy')
  language?: string;
  dir?: 'ltr' | 'rtl';
}

type DateInputProps = DateInputBaseProps & Omit<React.HTMLAttributes<HTMLDivElement>, keyof DateInputBaseProps>;

const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({
    value,
    onChange,
    placeholder = "Select a date",
    disabled = false,
    fromYear = 1900,
    toYear = new Date().getFullYear() + 10,
    disableFuture = true,
    dateFormat = 'PPP',
    dir = 'ltr',
    language = 'en',
    className,
    ...props
  }, ref) => {
    const [inputValue, setInputValue] = React.useState('');
    const date = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined;
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Combine the forwarded ref with the local ref
    React.useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
      value: inputValue,
      // Only include HTMLInputElement properties that are actually needed
      ...(inputRef.current ? {
        value: inputRef.current.value,
        focus: inputRef.current.focus,
        blur: inputRef.current.blur,
        select: inputRef.current.select,
        setSelectionRange: inputRef.current.setSelectionRange,
        click: inputRef.current.click
      } : {})
    } as HTMLInputElement));

    // Update input value when value prop changes
    React.useEffect(() => {
      if (date && isValid(date)) {
        setInputValue(format(date, dateFormat));
      } else {
        setInputValue('');
      }
    }, [value, dateFormat]);

    const handleSelect = (selectedDate: any | undefined) => {
      if (selectedDate) {
        const jsDate = selectedDate ? selectedDate.toDate?.() || selectedDate : null;
        const formattedDate = format(jsDate, 'yyyy-MM-dd');
        onChange?.(formattedDate);
      }
    };

    return (
      <div className={cn("w-full relative", className)} {...props}>
        <div className="relative">
          <Calendar
              onChange={handleSelect}
              value={date}
              locale={language}
              dir={dir}
              disableFuture={disableFuture}
              dateFormat={dateFormat}
            />
        </div>
      </div>
    );
  }
);

DateInput.displayName = "DateInput";

export { DateInput, type DateInputProps };
