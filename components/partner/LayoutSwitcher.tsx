"use client";

import { useState } from "react";
import { Grid3X3, List } from "lucide-react";

interface LayoutSwitcherProps {
  onLayoutChange: (layout: 'list' | 'grid') => void;
  currentLayout: 'list' | 'grid';
}

export default function LayoutSwitcher({ onLayoutChange, currentLayout }: LayoutSwitcherProps) {
  return (
    <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => onLayoutChange('list')}
        className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          currentLayout === 'list'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <List className="h-4 w-4 mr-2" />
        List
      </button>
      <button
        onClick={() => onLayoutChange('grid')}
        className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          currentLayout === 'grid'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <Grid3X3 className="h-4 w-4 mr-2" />
        Grid
      </button>
    </div>
  );
}
