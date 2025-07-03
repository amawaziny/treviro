import React from "react";
import DatePicker from "react-multi-date-picker";
import locale_ar from "react-date-object/locales/gregorian_ar";
import "react-multi-date-picker/styles/backgrounds/bg-dark.css";
import "react-multi-date-picker/styles/layouts/mobile.css"; // For mobile-specific styles
import { Calendar as CalenderIcon } from "lucide-react";

type Props = {
  value?: Date | string;
  onChange?: (date: any) => void;
  dir?: "ltr" | "rtl";
  locale?: string;
  disableFuture?: boolean;
  dateFormat?: string;
  mobile?: boolean;
};

function Calendar({
  value,
  onChange,
  dir = "ltr",
  locale = "en",
  disableFuture,
  dateFormat,
  mobile = false,
}: Props) {
  return (
    <div className="relative w-full">
      <DatePicker
        value={value}
        onChange={onChange}
        locale={locale == "ar" ? locale_ar : undefined}
        format={dateFormat === "dd-MM-yyyy" ? "DD-MM-YYYY" : dateFormat}
        maxDate={disableFuture ? new Date() : undefined}
        className={`bg-dark ${mobile ? "rmdp-mobile" : ""}`}
        containerClassName="w-full"
        inputMode="none"
        inputClass={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${locale === "ar" ? "" : "md:text-sm"} w-full ps-10`}
        {...(dir === "rtl" ? { rtl: true } : {})}
      />
      <CalenderIcon
        className={`absolute ${dir === "rtl" ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none w-4 h-4`}
      />
    </div>
  );
}

export { Calendar };
