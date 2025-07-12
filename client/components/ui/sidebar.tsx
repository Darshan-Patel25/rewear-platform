"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const sidebarVariants = cva("flex h-full flex-col overflow-y-auto border-r bg-background p-4", {
  variants: {
    variant: {
      default: "w-64",
      collapsed: "w-16",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

export interface SidebarProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof sidebarVariants> {
  isCollapsed?: boolean
}

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ className, isCollapsed, children, ...props }, ref) => (
    <aside
      ref={ref}
      className={cn(sidebarVariants({ variant: isCollapsed ? "collapsed" : "default" }), className)}
      {...props}
    >
      {children}
    </aside>
  ),
)
Sidebar.displayName = "Sidebar"

const SidebarHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("mb-4 flex items-center justify-between", className)} {...props} />
  ),
)
SidebarHeader.displayName = "SidebarHeader"

const SidebarTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => <h3 ref={ref} className={cn("text-lg font-semibold", className)} {...props} />,
)
SidebarTitle.displayName = "SidebarTitle"

const SidebarToggle = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn("rounded-md p-2 hover:bg-accent hover:text-accent-foreground", className)}
      {...props}
    />
  ),
)
SidebarToggle.displayName = "SidebarToggle"

const SidebarNav = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <nav ref={ref} className={cn("flex-1 space-y-2", className)} {...props} />,
)
SidebarNav.displayName = "SidebarNav"

const SidebarNavLink = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    active?: boolean
  }
>(({ className, active, ...props }, ref) => (
  <a
    ref={ref}
    className={cn(
      "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
      active && "bg-accent text-accent-foreground",
      className,
    )}
    {...props}
  />
))
SidebarNavLink.displayName = "SidebarNavLink"

const SidebarFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("mt-auto border-t pt-4", className)} {...props} />,
)
SidebarFooter.displayName = "SidebarFooter"

export { Sidebar, SidebarHeader, SidebarTitle, SidebarToggle, SidebarNav, SidebarNavLink, SidebarFooter }
