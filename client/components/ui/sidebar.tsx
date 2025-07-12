"use client"

import type * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  isCollapsed: boolean
  links: {
    title: string
    label?: string
    icon: React.ElementType
    href: string
  }[]
}

export function Sidebar({ className, isCollapsed, links }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div
      data-collapsed={isCollapsed}
      className={cn("group flex flex-col gap-4 py-2 data-[collapsed=true]:py-2", className)}
    >
      <nav className="grid gap-1 px-2 group-[[data-collapsed=true]]:justify-center group-[[data-collapsed=true]]:px-2">
        {links.map((link, index) =>
          isCollapsed ? (
            <TooltipProvider key={index}>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    href={link.href}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground",
                      pathname === link.href && "bg-accent text-accent-foreground",
                      "dark:hover:text-white dark:text-gray-400",
                    )}
                  >
                    <link.icon className="h-5 w-5" />
                    <span className="sr-only">{link.title}</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="flex items-center gap-4">
                  {link.title}
                  {link.label && <span className="ml-auto text-muted-foreground">{link.label}</span>}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Link
              key={index}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-foreground",
                pathname === link.href && "bg-accent text-accent-foreground",
                "dark:hover:text-white dark:text-gray-400",
              )}
            >
              <link.icon className="h-5 w-5" />
              {link.title}
              {link.label && (
                <span className={cn("ml-auto", pathname === link.href && "text-background dark:text-white")}>
                  {link.label}
                </span>
              )}
            </Link>
          ),
        )}
      </nav>
    </div>
  )
}
