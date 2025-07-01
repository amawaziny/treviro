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
    className,
    ...props
  }, ref) => {
    const [open, setOpen] = React.useState(false);
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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      
      // Try to parse the input value according to the dateFormat
      try {
        const parsedDate = parse(newValue, dateFormat, new Date());
        if (isValid(parsedDate)) {
          const formattedDate = format(parsedDate, 'yyyy-MM-dd');
          onChange?.(formattedDate);
        } else {
          // If not a valid date, clear the value
          onChange?.('');
        }
      } catch (error) {
        onChange?.('');
      }
    };

    const handleSelect = (selectedDate: Date | undefined) => {
      if (selectedDate) {
        const formattedDate = format(selectedDate, 'yyyy-MM-dd');
        onChange?.(formattedDate);
        setOpen(false);
      }
    };

    return (
      <div className={cn("w-full relative", className)} {...props}>
        <div className="relative">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            placeholder={placeholder}
            disabled={disabled}
            className={cn("pr-10 w-full", !inputValue && "text-muted-foreground")}
          />
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={(e) => {
                  e.preventDefault();
                  setOpen(!open);
                }}
                disabled={disabled}
              >
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleSelect}
              disabled={(date: Date) => 
                (disableFuture && date > new Date()) || 
                date < new Date(`${fromYear}-01-01`) || 
                date > new Date(`${toYear}-12-31`)
              }
              initialFocus
              fromYear={fromYear}
              toYear={toYear}
              captionLayout="dropdown"
              className="rounded-md border"
              dir={dir}
            />
          </PopoverContent>
        </Popover>
        </div>
      </div>
    );
  }
);

DateInput.displayName = "DateInput";

export { DateInput, type DateInputProps };
