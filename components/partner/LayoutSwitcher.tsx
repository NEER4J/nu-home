"use client";

import { useState } from "react";
import { Grid3X3, Table } from "lucide-react";

interface LayoutSwitcherProps {
  onLayoutChange: (layout: 'grid' | 'table') => void;
  currentLayout: 'grid' | 'table';
}

export default function LayoutSwitcher({ onLayoutChange, currentLayout }: LayoutSwitcherProps) {
  return (
    <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
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
      <button
        onClick={() => onLayoutChange('table')}
        className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          currentLayout === 'table'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <Table className="h-4 w-4 mr-2" />
        Table
      </button>
    </div>
  );
}
