"use client";

import { useState } from "react";
import { PlusCircle } from 'lucide-react';

interface AddToMyAddonsButtonProps {
  adminAddonId: string;
  onAddAddon: (adminAddonId: string) => Promise<{ success: boolean }>;
}

export default function AddToMyAddonsButton({ 
  adminAddonId, 
  onAddAddon 
}: AddToMyAddonsButtonProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const handleAddAddon = async () => {
    setIsAdding(true);
    try {
      const result = await onAddAddon(adminAddonId);
      if (result.success) {
        setIsAdded(true);
      }
    } catch (error) {
      console.error('Error adding addon:', error);
      // You might want to show a toast notification here
      alert('Failed to add addon. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  if (isAdded) {
    return (
      <div className="inline-flex items-center px-3 py-1.5 bg-green-50 border border-green-200 rounded-md">
        <svg className="h-4 w-4 text-green-500 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        <span className="text-sm font-medium text-green-700">Added!</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleAddAddon}
      disabled={isAdding}
      className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-70"
    >
      {isAdding ? (
        <span className="animate-pulse">Adding...</span>
      ) : (
        <>
          <PlusCircle className="mr-1.5 h-4 w-4" />
          Add to My Addons
        </>
      )}
    </button>
  );
}
