"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  dir?: "ltr" | "rtl"
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  dir = "ltr",
  ...props
}: CalendarProps) {
  const isRTL = dir === "rtl"

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      dir={dir}
      className={cn(
        // Added min-w-[320px] and overflow-x-auto for better popup sizing
        "p-3 w-full min-w-[320px] bg-background rounded-md border overflow-x-auto",
        isRTL && "rtl",
        className
      )}
      classNames={{
        months: cn(
          "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          isRTL && "sm:flex-row-reverse"
        ),
        month: "space-y-4 w-full",
        caption: cn(
          "flex justify-center pt-1 relative items-center mb-4",
          isRTL && "flex-row-reverse"
        ),
        caption_label: "text-sm font-medium",
        nav: cn(
          "space-x-1 flex items-center",
          isRTL && "flex-row-reverse space-x-reverse"
        ),
        nav_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: cn(
          "absolute",
          isRTL ? "right-1" : "left-1"
        ),
        nav_button_next: cn(
          "absolute",
          isRTL ? "left-1" : "right-1"
        ),
        table: "w-full border-collapse space-y-1",
        head_row: cn(
          "flex w-full justify-between",
          isRTL && "flex-row-reverse"
        ),
        head_cell: "text-muted-foreground w-9 font-normal text-sm flex items-center justify-center",
        row: cn(
          "flex w-full mt-2 justify-between",
          isRTL && "flex-row-reverse"
        ),
        cell: "h-9 w-9 p-0 text-center text-sm [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside: "text-muted-foreground opacity-50",
        day_disabled: "text-muted-foreground opacity-50",
        ...classNames,
      }}
      {...props}
    />
  )
}

Calendar.displayName = "Calendar"

export { Calendar }