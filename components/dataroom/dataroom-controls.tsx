"use client"

import * as React from "react";
import { SearchBar } from "./search-bar";
import { ViewToggle } from "./view-toggle";
import { FilterSelect } from "./filter-select";
import { FILE_TYPE_OPTIONS } from "@/lib/dataroom-search-filter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getCalendarDays(year: number, month: number): { date: string; day: number; isCurrentMonth: boolean }[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay();
  const daysInMonth = last.getDate();
  const result: { date: string; day: number; isCurrentMonth: boolean }[] = [];
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const prevLast = new Date(prevYear, prevMonth + 1, 0).getDate();
  for (let i = 0; i < startPad; i++) {
    const d = prevLast - startPad + 1 + i;
    const y = prevYear;
    const m = String(prevMonth + 1).padStart(2, "0");
    result.push({ date: `${y}-${m}-${String(d).padStart(2, "0")}`, day: d, isCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const m = String(month + 1).padStart(2, "0");
    result.push({ date: `${year}-${m}-${String(d).padStart(2, "0")}`, day: d, isCurrentMonth: true });
  }
  const remaining = 42 - result.length;
  for (let i = 1; i <= remaining; i++) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const m = String(nextMonth + 1).padStart(2, "0");
    result.push({ date: `${nextYear}-${m}-${String(i).padStart(2, "0")}`, day: i, isCurrentMonth: false });
  }
  return result;
}

function DateFilterDropdown({
  dateValue,
  onDateChange,
  dateDisplayLabel,
}: {
  dateValue: string;
  onDateChange: (value: string) => void;
  dateDisplayLabel: string;
}) {
  const [open, setOpen] = React.useState(false);
  const initial = dateValue ? new Date(dateValue + "T12:00:00") : new Date();
  const [viewYear, setViewYear] = React.useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(initial.getMonth());

  React.useEffect(() => {
    if (open) {
      const d = dateValue ? new Date(dateValue + "T12:00:00") : new Date();
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [open, dateValue]);

  const days = React.useMemo(() => getCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);
  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const pickDate = (date: string) => {
    onDateChange(date);
    setOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Date</span>
      <div className="flex items-center gap-1">
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex items-center gap-2 w-[180px] h-9 pl-2.5 pr-2 rounded-lg border border-input bg-background text-sm text-left",
                "hover:bg-accent/50 hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2"
              )}
            >
              <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className={cn("truncate", !dateValue && "text-muted-foreground")}>
                {dateDisplayLabel}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="p-3 w-auto">
            <div className="flex items-center justify-between gap-2 mb-3">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
                aria-label="Previous month"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium min-w-[140px] text-center">{monthLabel}</span>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
                aria-label="Next month"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {WEEKDAYS.map((w) => (
                <div key={w} className="text-center text-xs text-muted-foreground py-1">
                  {w}
                </div>
              ))}
              {days.map(({ date, day, isCurrentMonth }) => (
                <button
                  key={date}
                  type="button"
                  onClick={() => pickDate(date)}
                  className={cn(
                    "h-8 w-8 rounded-md text-sm",
                    isCurrentMonth ? "text-foreground hover:bg-accent" : "text-muted-foreground/70 hover:bg-accent/50",
                    dateValue === date && "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  {day}
                </button>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        {dateValue ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => onDateChange("")}
            aria-label="Clear date"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

interface DataRoomControlsProps {
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  onSearch?: (value: string) => void;
  onDownload?: () => void;
  searchPlaceholder?: string;
  showDownload?: boolean;
  /** Controlled search (enables global search) */
  searchValue?: string;
  /** When set, show file type and date filters */
  fileTypeValue?: string;
  onFileTypeChange?: (value: string) => void;
  /** Calendar date YYYY-MM-DD, or "" for any date */
  dateValue?: string;
  onDateChange?: (value: string) => void;
}

export function DataRoomControls({
  viewMode,
  onViewModeChange,
  onSearch,
  onDownload,
  searchPlaceholder,
  showDownload = true,
  searchValue = "",
  fileTypeValue = "all",
  onFileTypeChange,
  dateValue = "",
  onDateChange,
}: DataRoomControlsProps) {
  const showFilters = onFileTypeChange || onDateChange;

  const dateDisplayLabel = dateValue
    ? new Date(dateValue + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "Select date";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1">
          <SearchBar
            placeholder={searchPlaceholder}
            value={searchValue}
            onSearch={onSearch}
          />
        </div>
        <div>
          <ViewToggle
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
            showDownload={showDownload}
            onDownload={onDownload}
          />
        </div>
      </div>
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3">
          {onFileTypeChange && (
            <FilterSelect
              label="File type"
              value={fileTypeValue}
              onValueChange={onFileTypeChange}
              options={FILE_TYPE_OPTIONS}
              placeholder="All types"
              width="w-[130px]"
            />
          )}
          {onDateChange && (
            <DateFilterDropdown
              dateValue={dateValue}
              onDateChange={onDateChange}
              dateDisplayLabel={dateDisplayLabel}
            />
          )}
        </div>
      )}
    </div>
  );
}
