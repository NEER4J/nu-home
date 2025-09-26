"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  className?: string;
  isLoading?: boolean;
  autoSearchOnMount?: boolean;
}

export default function SearchBar({ 
  placeholder = "Search products...", 
  onSearch, 
  className = "",
  isLoading = false,
  autoSearchOnMount = false
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const hasMountedRef = useRef(false);

  useEffect(() => {
    // Skip invoking onSearch on initial mount unless explicitly enabled
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      if (!autoSearchOnMount) return;
    }

    const timeoutId = setTimeout(() => {
      onSearch(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, onSearch]);

  const clearSearch = () => {
    setQuery("");
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
        {(isLoading || query) && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
            ) : (
              query && (
                <button
                  onClick={clearSearch}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  <X className="h-4 w-4" />
                </button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
