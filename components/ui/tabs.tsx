"use client";

import React from "react";

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className = "", defaultValue, value, onValueChange, ...props }, ref) => {
    return <div ref={ref} className={`${className}`} {...props} />;
  }
);
Tabs.displayName = "Tabs";

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex space-x-1 rounded-lg bg-gray-100 p-1 ${className}`}
        {...props}
      />
    );
  }
);
TabsList.displayName = "TabsList";

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className = "", value, ...props }, ref) => {
    // Check if this tab is currently selected
    const isSelected = props['aria-selected'] === true;
    
    return (
      <button
        ref={ref}
        role="tab"
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all focus:outline-none ${
          isSelected 
            ? "bg-white text-gray-900 shadow" 
            : "text-gray-600 hover:text-gray-900"
        } ${className}`}
        {...props}
      />
    );
  }
);
TabsTrigger.displayName = "TabsTrigger";

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className = "", value, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="tabpanel"
        className={`mt-2 rounded-md ${className}`}
        {...props}
      />
    );
  }
);
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent }; 