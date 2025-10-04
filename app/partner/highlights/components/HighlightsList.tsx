"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  Plus, Edit, Trash2, Eye, EyeOff, Calendar, ExternalLink,
  Info, CheckCircle, AlertTriangle, Gift, Megaphone,
  Star, Heart, Zap, Shield, Award, Target, TrendingUp,
  Users, Clock, MapPin, Phone, Mail, Globe, Settings,
  Lightbulb, Rocket, Crown, Diamond, Flame, Sparkles
} from 'lucide-react';
import { PartnerHighlight } from '@/types/database.types';
import HighlightForm from './HighlightForm';

interface HighlightsListProps {
  initialHighlights: PartnerHighlight[];
  onRefresh?: () => void;
}

// Icon mapping
const iconMap = {
  Info, CheckCircle, AlertTriangle, Gift, Megaphone,
  Star, Heart, Zap, Shield, Award, Target, TrendingUp,
  Users, Clock, MapPin, Phone, Mail, Globe, Settings,
  Lightbulb, Rocket, Crown, Diamond, Flame, Sparkles
};

// Helper function to get icon component
const getIconComponent = (iconName: string | null) => {
  if (!iconName || !(iconName in iconMap)) {
    return Info; // Default icon
  }
  return iconMap[iconName as keyof typeof iconMap];
};

export default function HighlightsList({ initialHighlights, onRefresh }: HighlightsListProps) {
  const [highlights, setHighlights] = useState<PartnerHighlight[]>(initialHighlights);

  // Update highlights when initialHighlights prop changes
  useEffect(() => {
    setHighlights(initialHighlights);
  }, [initialHighlights]);

  const deleteHighlight = async (highlightId: string) => {
    if (!confirm('Are you sure you want to delete this highlight?')) {
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('PartnerHighlights')
        .delete()
        .eq('highlight_id', highlightId);

      if (error) {
        console.error('Error deleting highlight:', error);
        alert('Failed to delete highlight');
        return;
      }

      setHighlights(highlights.filter(h => h.highlight_id !== highlightId));
    } catch (err) {
      console.error('Error in deleteHighlight:', err);
      alert('Failed to delete highlight');
    }
  };

  const toggleHighlightStatus = async (highlightId: string, currentStatus: boolean) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('PartnerHighlights')
        .update({ is_active: !currentStatus })
        .eq('highlight_id', highlightId);

      if (error) {
        console.error('Error toggling highlight status:', error);
        alert('Failed to update highlight status');
        return;
      }

      setHighlights(highlights.map(h => 
        h.highlight_id === highlightId 
          ? { ...h, is_active: !currentStatus }
          : h
      ));
    } catch (err) {
      console.error('Error in toggleHighlightStatus:', err);
      alert('Failed to update highlight status');
    }
  };

  const refreshHighlights = async () => {
    if (onRefresh) {
      onRefresh();
    } else {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;

        const { data, error } = await supabase
          .from('PartnerHighlights')
          .select('*')
          .eq('partner_id', user.id)
          .order('priority', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching highlights:', error);
          return;
        }

        setHighlights((data as unknown as PartnerHighlight[]) || []);
      } catch (err) {
        console.error('Error in refreshHighlights:', err);
      }
    }
  };

  // Helper function to generate color styles from hex color
  const generateColorStyles = (hexColor: string) => {
    // Convert hex to RGB
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Use the color as background, text is always white
    const bgColor = `rgb(${r}, ${g}, ${b})`;
    
    return {
      bg: `bg-[${bgColor}]`,
      border: `border-[${bgColor}]`,
      text: `text-white`,
      style: {
        backgroundColor: bgColor,
        borderColor: bgColor,
        color: 'white'
      }
    };
  };

  const getColorSchemeStyles = (colorScheme: string | null) => {
    // Check if it's a hex color
    if (colorScheme && colorScheme.startsWith('#')) {
      return generateColorStyles(colorScheme);
    }

    // Default to blue hex color
    return generateColorStyles('#3B82F6');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No date set";
    return new Date(dateString).toLocaleDateString();
  };

  const isDateRangeValid = (highlight: PartnerHighlight) => {
    const now = new Date();
    const startDate = highlight.start_date ? new Date(highlight.start_date) : null;
    const endDate = highlight.end_date ? new Date(highlight.end_date) : null;

    if (startDate && now < startDate) return false;
    if (endDate && now > endDate) return false;
    return true;
  };

  return (
    <>
      {/* Highlights List */}
      {highlights.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-gray-400 mb-4">
            <Plus className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No announcements yet</h3>
          <p className="text-gray-500 mb-4">
            Create your first header announcement to show special offers or announcements.
          </p>
          <HighlightForm 
            onSuccess={refreshHighlights}
            mode="create"
          />
        </div>
      ) : (
        <div className="space-y-4 ">
          {highlights.map((highlight: PartnerHighlight) => {
            const colorStyles = getColorSchemeStyles(highlight.color_scheme);
            const isDateValid = isDateRangeValid(highlight);
            const isActive = highlight.is_active && isDateValid;

            return (
              <div key={highlight.highlight_id} className="space-y-4 p-5 border border-gray-200 rounded-lg">
                {/* Header Preview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-700">Header Preview</h4>
                    <span className="text-xs text-gray-500">How it appears in your header</span>
                  </div>
                  <div className="relative overflow-hidden rounded-lg" style={{
                    backgroundColor: colorStyles.style?.backgroundColor || '#3B82F6'
                  }}>
                  <div className="relative px-4 py-3">
                    {/* Desktop Preview */}
                    <div className="hidden sm:flex items-center max-w-[1480px] mx-auto justify-center">
                      <div className="flex items-center min-w-0 justify-center">
                        {(() => {
                          const IconComponent = getIconComponent(highlight.icon);
                          return <IconComponent className="h-5 w-5 mr-3 text-white flex-shrink-0" />;
                        })()}
                        <h4 className="font-bold text-white text-base mr-4 whitespace-nowrap">
                          {highlight.title}
                        </h4>
                        <p className="text-white text-sm opacity-90 flex-1 min-w-0">
                          {highlight.message}
                        </p>
                      </div>
                    </div>
                    
                    {/* Mobile Preview */}
                    <div className="sm:hidden relative overflow-hidden">
                      <div className="flex items-center space-x-4 animate-marquee whitespace-nowrap">
                        {(() => {
                          const IconComponent = getIconComponent(highlight.icon);
                          return <IconComponent className="h-5 w-5 text-white flex-shrink-0" />;
                        })()}
                        <h4 className="font-bold text-white text-base">
                          {highlight.title}
                        </h4>
                        <span className="text-white text-sm opacity-90">
                          {highlight.message}
                        </span>
                      </div>
                    </div>
                  </div>
                  </div>
                </div>

                {/* Admin Controls */}
                <div className={`bg-white rounded-lg p-6 ${
                  !isActive ? 'opacity-60' : ''
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        {(() => {
                          const IconComponent = getIconComponent(highlight.icon);
                          return <IconComponent 
                            className="h-5 w-5 mr-2 text-gray-600" 
                          />;
                        })()}
                        <h3 className="text-lg font-medium text-gray-900">{highlight.title}</h3>
                        {highlight.priority > 0 && (
                          <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                            Priority: {highlight.priority}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-gray-600 mb-3">{highlight.message}</p>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>
                            {highlight.start_date ? formatDate(highlight.start_date) : 'No start date'} - 
                            {highlight.end_date ? formatDate(highlight.end_date) : 'No end date'}
                          </span>
                        </div>
                        
                        <div className="flex items-center">
                          {isActive ? (
                            <span className="flex items-center text-green-600">
                              <Eye className="h-4 w-4 mr-1" />
                              Active
                            </span>
                          ) : (
                            <span className="flex items-center text-gray-400">
                              <EyeOff className="h-4 w-4 mr-1" />
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <HighlightForm 
                        highlight={highlight} 
                        mode="edit"
                        onSuccess={refreshHighlights}
                      />
                      
                      <button
                        onClick={() => toggleHighlightStatus(highlight.highlight_id, highlight.is_active)}
                        className={`p-2 rounded-md transition-colors ${
                          highlight.is_active 
                            ? 'text-yellow-600 hover:bg-yellow-50' 
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                        title={highlight.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {highlight.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      
                      <button
                        onClick={() => deleteHighlight(highlight.highlight_id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
