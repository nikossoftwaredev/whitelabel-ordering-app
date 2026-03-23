"use client"

import { useState } from "react"
import { ChevronDown, Search } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { inputVariants } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const COUNTRIES = [
  { code: "GR", dial: "+30", name: "Greece", flag: "🇬🇷" },
  { code: "FR", dial: "+33", name: "France", flag: "🇫🇷" },
  { code: "DE", dial: "+49", name: "Germany", flag: "🇩🇪" },
  { code: "IT", dial: "+39", name: "Italy", flag: "🇮🇹" },
  { code: "ES", dial: "+34", name: "Spain", flag: "🇪🇸" },
  { code: "PT", dial: "+351", name: "Portugal", flag: "🇵🇹" },
  { code: "GB", dial: "+44", name: "United Kingdom", flag: "🇬🇧" },
  { code: "US", dial: "+1", name: "United States", flag: "🇺🇸" },
  { code: "CA", dial: "+1", name: "Canada", flag: "🇨🇦" },
  { code: "NL", dial: "+31", name: "Netherlands", flag: "🇳🇱" },
  { code: "BE", dial: "+32", name: "Belgium", flag: "🇧🇪" },
  { code: "CH", dial: "+41", name: "Switzerland", flag: "🇨🇭" },
  { code: "AT", dial: "+43", name: "Austria", flag: "🇦🇹" },
  { code: "SE", dial: "+46", name: "Sweden", flag: "🇸🇪" },
  { code: "NO", dial: "+47", name: "Norway", flag: "🇳🇴" },
  { code: "DK", dial: "+45", name: "Denmark", flag: "🇩🇰" },
  { code: "FI", dial: "+358", name: "Finland", flag: "🇫🇮" },
  { code: "PL", dial: "+48", name: "Poland", flag: "🇵🇱" },
  { code: "CZ", dial: "+420", name: "Czech Republic", flag: "🇨🇿" },
  { code: "RO", dial: "+40", name: "Romania", flag: "🇷🇴" },
  { code: "BG", dial: "+359", name: "Bulgaria", flag: "🇧🇬" },
  { code: "HR", dial: "+385", name: "Croatia", flag: "🇭🇷" },
  { code: "RS", dial: "+381", name: "Serbia", flag: "🇷🇸" },
  { code: "HU", dial: "+36", name: "Hungary", flag: "🇭🇺" },
  { code: "SK", dial: "+421", name: "Slovakia", flag: "🇸🇰" },
  { code: "SI", dial: "+386", name: "Slovenia", flag: "🇸🇮" },
  { code: "IE", dial: "+353", name: "Ireland", flag: "🇮🇪" },
  { code: "CY", dial: "+357", name: "Cyprus", flag: "🇨🇾" },
  { code: "MT", dial: "+356", name: "Malta", flag: "🇲🇹" },
  { code: "LU", dial: "+352", name: "Luxembourg", flag: "🇱🇺" },
  { code: "TR", dial: "+90", name: "Turkey", flag: "🇹🇷" },
  { code: "RU", dial: "+7", name: "Russia", flag: "🇷🇺" },
  { code: "UA", dial: "+380", name: "Ukraine", flag: "🇺🇦" },
  { code: "AL", dial: "+355", name: "Albania", flag: "🇦🇱" },
  { code: "MK", dial: "+389", name: "North Macedonia", flag: "🇲🇰" },
  { code: "ME", dial: "+382", name: "Montenegro", flag: "🇲🇪" },
  { code: "BA", dial: "+387", name: "Bosnia and Herzegovina", flag: "🇧🇦" },
  { code: "XK", dial: "+383", name: "Kosovo", flag: "🇽🇰" },
  { code: "AU", dial: "+61", name: "Australia", flag: "🇦🇺" },
  { code: "NZ", dial: "+64", name: "New Zealand", flag: "🇳🇿" },
  { code: "JP", dial: "+81", name: "Japan", flag: "🇯🇵" },
  { code: "KR", dial: "+82", name: "South Korea", flag: "🇰🇷" },
  { code: "CN", dial: "+86", name: "China", flag: "🇨🇳" },
  { code: "IN", dial: "+91", name: "India", flag: "🇮🇳" },
  { code: "BR", dial: "+55", name: "Brazil", flag: "🇧🇷" },
  { code: "MX", dial: "+52", name: "Mexico", flag: "🇲🇽" },
  { code: "AR", dial: "+54", name: "Argentina", flag: "🇦🇷" },
  { code: "CO", dial: "+57", name: "Colombia", flag: "🇨🇴" },
  { code: "CL", dial: "+56", name: "Chile", flag: "🇨🇱" },
  { code: "CU", dial: "+53", name: "Cuba", flag: "🇨🇺" },
  { code: "DO", dial: "+1", name: "Dominican Republic", flag: "🇩🇴" },
  { code: "PR", dial: "+1", name: "Puerto Rico", flag: "🇵🇷" },
  { code: "EG", dial: "+20", name: "Egypt", flag: "🇪🇬" },
  { code: "ZA", dial: "+27", name: "South Africa", flag: "🇿🇦" },
  { code: "IL", dial: "+972", name: "Israel", flag: "🇮🇱" },
  { code: "AE", dial: "+971", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "SA", dial: "+966", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "LB", dial: "+961", name: "Lebanon", flag: "🇱🇧" },
] as const

type Country = (typeof COUNTRIES)[number]

const DEFAULT_COUNTRY = COUNTRIES[0] // Greece
const COUNTRIES_BY_DIAL_LENGTH = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length)

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  className?: string
  id?: string
  name?: string
}

export const PhoneInput = ({
  value,
  onChange,
  onBlur,
  placeholder = "6912345678",
  disabled,
  required,
  className,
  id,
  name,
}: PhoneInputProps) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  // Parse country code from value, or use default
  let selectedCountry: Country = DEFAULT_COUNTRY
  let nationalNumber = value || ""
  if (value) {
    for (const country of COUNTRIES_BY_DIAL_LENGTH) {
      if (value.startsWith(country.dial)) {
        selectedCountry = country
        nationalNumber = value.slice(country.dial.length)
        break
      }
    }
  } else {
    nationalNumber = ""
  }

  const filteredCountries = search
    ? COUNTRIES.filter((c) => {
        const q = search.toLowerCase()
        return c.name.toLowerCase().includes(q) || c.dial.includes(q) || c.code.toLowerCase().includes(q)
      })
    : COUNTRIES

  const handleCountrySelect = (country: Country) => {
    onChange(country.dial + nationalNumber)
    setOpen(false)
    setSearch("")
  }

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/[^\d]/g, "")
    onChange(selectedCountry.dial + digits)
  }

  return (
    <div className={cn("flex", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              inputVariants(),
              "flex w-auto items-center gap-1 rounded-r-none border-r-0 px-2.5 focus-visible:z-10",
              disabled && "pointer-events-none opacity-50"
            )}
          >
            <span className="text-base leading-none">{selectedCountry.flag}</span>
            <span className="text-sm text-muted-foreground">{selectedCountry.dial}</span>
            <ChevronDown size={12} className="text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-0">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search size={14} className="shrink-0 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ScrollArea className="h-64">
            <div className="p-1">
              {filteredCountries.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No country found</p>
              ) : (
                filteredCountries.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleCountrySelect(country)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors duration-300 hover:bg-accent",
                      selectedCountry.code === country.code && "bg-accent"
                    )}
                  >
                    <span className="text-base leading-none">{country.flag}</span>
                    <span className="flex-1 text-left">{country.name}</span>
                    <span className="text-xs text-muted-foreground">{country.dial}</span>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
      <input
        id={id}
        name={name}
        type="tel"
        value={nationalNumber}
        onChange={handleNumberChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={cn(
          inputVariants(),
          "rounded-l-none"
        )}
      />
    </div>
  )
}
