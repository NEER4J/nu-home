"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Plus, Edit, Trash2, Eye, EyeOff, Star, Zap, Truck, CreditCard, Shield, Award, Clock, Users, Heart } from 'lucide-react';
import { PartnerKeyPoint } from '@/types/database.types';
import KeyPointForm from './KeyPointForm';

interface KeyPointsListProps {
  initialKeyPoints: PartnerKeyPoint[];
  onRefresh?: () => void;
}

// Icon mapping
const iconMap = {
  Star, Zap, Truck, CreditCard, Shield, Award, Clock, Users, Heart
};

// Helper function to get icon component
const getIconComponent = (iconName: string | null) => {
  if (!iconName || !(iconName in iconMap)) {
    return Star; // Default icon
  }
  return iconMap[iconName as keyof typeof iconMap];
};

export default function KeyPointsList({ initialKeyPoints, onRefresh }: KeyPointsListProps) {
  const [keyPoints, setKeyPoints] = useState<PartnerKeyPoint[]>(initialKeyPoints);

  // Update key points when initialKeyPoints prop changes
  useEffect(() => {
    setKeyPoints(initialKeyPoints);
  }, [initialKeyPoints]);

  const deleteKeyPoint = async (keyPointId: string) => {
    if (!confirm('Are you sure you want to delete this key point?')) {
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('PartnerKeyPoints')
        .delete()
        .eq('key_point_id', keyPointId);

      if (error) {
        console.error('Error deleting key point:', error);
        alert('Failed to delete key point');
        return;
      }

      if (onRefresh) {
        onRefresh();
      } else {
        setKeyPoints(keyPoints.filter(kp => kp.key_point_id !== keyPointId));
      }
    } catch (err) {
      console.error('Error in deleteKeyPoint:', err);
      alert('Failed to delete key point');
    }
  };

  const toggleKeyPointStatus = async (keyPointId: string, currentStatus: boolean) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('PartnerKeyPoints')
        .update({ is_active: !currentStatus })
        .eq('key_point_id', keyPointId);

      if (error) {
        console.error('Error toggling key point status:', error);
        alert('Failed to update key point status');
        return;
      }

      if (onRefresh) {
        onRefresh();
      } else {
        setKeyPoints(keyPoints.map(kp => 
          kp.key_point_id === keyPointId 
            ? { ...kp, is_active: !currentStatus }
            : kp
        ));
      }
    } catch (err) {
      console.error('Error in toggleKeyPointStatus:', err);
      alert('Failed to update key point status');
    }
  };

  const refreshKeyPoints = async () => {
    if (onRefresh) {
      onRefresh();
    } else {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;

        const { data, error } = await supabase
          .from('PartnerKeyPoints')
          .select('*')
          .eq('partner_id', user.id)
          .order('position', { ascending: true });

        if (error) {
          console.error('Error fetching key points:', error);
          return;
        }

        setKeyPoints((data as unknown as PartnerKeyPoint[]) || []);
      } catch (err) {
        console.error('Error in refreshKeyPoints:', err);
      }
    }
  };

  // Create array of 4 positions, filling with existing key points or empty slots
  const positions = Array.from({ length: 4 }, (_, index) => {
    const position = index + 1;
    return keyPoints.find(kp => kp.position === position) || null;
  });

  if (keyPoints.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-24 w-24 text-gray-400">
          <Plus className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No key points yet</h3>
        <p className="text-gray-500 mb-4">
          Create your first key point to highlight your main benefits.
        </p>
        <KeyPointForm 
          onSuccess={refreshKeyPoints}
          mode="create"
          existingKeyPoints={keyPoints}
        />
      </div>
    );
  }

  return (
    <>
      {/* Main Header Preview */}
      <div className="mb-8">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-medium text-gray-700">Header Preview</h4>
            <span className="text-sm text-gray-500">How your key points appear in the header</span>
          </div>
          <div className="bg-gray-100 border-b border-gray-200 w-full">
            <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8">
              <div className="py-2">
                <div className="flex items-center w-full">
                  {positions.map((keyPoint, index) => {
                    const position = index + 1;
                    let alignmentClass = '';
                    
                    if (positions.length === 4) {
                      if (index === 0) {
                        alignmentClass = 'justify-start'; // First item at start
                      } else if (index === 1 || index === 2) {
                        alignmentClass = 'justify-center'; // Middle two centered
                      } else if (index === 3) {
                        alignmentClass = 'justify-end'; // Last item at end
                      }
                    } else {
                      // Fallback for other lengths - distribute evenly
                      alignmentClass = 'justify-center flex-1';
                    }
                    
                    if (keyPoint && keyPoint.is_active) {
                      const IconComponent = getIconComponent(keyPoint.icon);
                      return (
                        <div key={keyPoint.key_point_id} className={`flex items-center space-x-3 ${alignmentClass} ${positions.length === 4 ? 'w-1/4' : 'flex-1'}`}>
                          <IconComponent className="h-5 w-5 text-gray-600 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-900 truncate">{keyPoint.title}</span>
                        </div>
                      );
                    } else {
                      return (
                        <div key={`empty-${position}`} className={`flex items-center space-x-3 text-gray-400 ${alignmentClass} ${positions.length === 4 ? 'w-1/4' : 'flex-1'}`}>
                          <div className="h-5 w-5 bg-gray-300 rounded"></div>
                          <span className="text-sm truncate">Position {position}</span>
                        </div>
                      );
                    }
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Only show Add Key Point form if there are available positions */}
      {keyPoints.length < 4 ? (
        <div className="mb-6">
          <KeyPointForm 
            onSuccess={refreshKeyPoints}
            mode="create"
            existingKeyPoints={keyPoints}
          />
        </div>
      ) : (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">4/4</span>
              </div>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                All key point positions are filled
              </h3>
              <p className="text-sm text-blue-600">
                You can edit or delete existing key points below to make room for new ones.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {positions.map((keyPoint, index) => {
          const position = index + 1;
          const isActive = keyPoint?.is_active ?? false;

          return (
            <div key={keyPoint?.key_point_id || `empty-${position}`} className="space-y-4 p-5 border border-gray-200 rounded-lg">

              {/* Admin Controls */}
              {keyPoint ? (
                <div className={`bg-white rounded-lg p-6 ${
                  !isActive ? 'opacity-60' : ''
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        {(() => {
                          const IconComponent = getIconComponent(keyPoint.icon);
                          return <IconComponent className="h-5 w-5 mr-2 text-gray-600" />;
                        })()}
                        <h3 className="text-lg font-medium text-gray-900">{keyPoint.title}</h3>
                        <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                          Position {keyPoint.position}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
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
                      <KeyPointForm 
                        keyPoint={keyPoint} 
                        mode="edit"
                        existingKeyPoints={keyPoints}
                        onSuccess={refreshKeyPoints}
                      />
                      
                      <button
                        onClick={() => toggleKeyPointStatus(keyPoint.key_point_id, keyPoint.is_active)}
                        className={`p-2 rounded-md transition-colors ${
                          keyPoint.is_active 
                            ? 'text-yellow-600 hover:bg-yellow-50' 
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                        title={keyPoint.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {keyPoint.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      
                      <button
                        onClick={() => deleteKeyPoint(keyPoint.key_point_id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <p className="text-gray-500 mb-4">Position {position} is empty</p>
                  <KeyPointForm 
                    mode="create"
                    onSuccess={refreshKeyPoints}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
