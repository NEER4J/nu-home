"use client";

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { PartnerKeyPoint } from '@/types/database.types';
import { X, Save, Edit, Plus, Star, Zap, Truck, CreditCard, Shield, Award, Clock, Users, Heart } from 'lucide-react';

interface KeyPointFormProps {
  keyPoint?: PartnerKeyPoint;
  mode: 'create' | 'edit';
  existingKeyPoints?: PartnerKeyPoint[];
  onSuccess?: () => void;
}

// Icon picker component
const IconPicker = ({ selectedIcon, onIconSelect }: { selectedIcon: string; onIconSelect: (icon: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const iconOptions = [
    { name: 'Star', component: Star, category: 'Popular' },
    { name: 'Zap', component: Zap, category: 'Popular' },
    { name: 'Truck', component: Truck, category: 'Popular' },
    { name: 'CreditCard', component: CreditCard, category: 'Popular' },
    { name: 'Shield', component: Shield, category: 'Trust' },
    { name: 'Award', component: Award, category: 'Trust' },
    { name: 'Clock', component: Clock, category: 'Time' },
    { name: 'Users', component: Users, category: 'Social' },
    { name: 'Heart', component: Heart, category: 'Social' }
  ];

  const selectedIconData = iconOptions.find(icon => icon.name === selectedIcon);
  const SelectedIconComponent = selectedIconData?.component || Star;

  const categories = Array.from(new Set(iconOptions.map(icon => icon.category)));

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
      >
        <div className="flex items-center">
          <SelectedIconComponent className="h-4 w-4 mr-2" />
          <span>{selectedIcon}</span>
        </div>
        <X className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-64 overflow-y-auto">
          {categories.map(category => (
            <div key={category}>
              <div className="px-3 py-2 bg-gray-50 text-xs font-medium text-gray-500 border-b">
                {category}
              </div>
              <div className="grid grid-cols-3 gap-1 p-2">
                {iconOptions
                  .filter(icon => icon.category === category)
                  .map(icon => {
                    const IconComponent = icon.component;
                    return (
                      <button
                        key={icon.name}
                        type="button"
                        onClick={() => {
                          onIconSelect(icon.name);
                          setIsOpen(false);
                        }}
                        className={`p-2 rounded-md hover:bg-gray-100 flex items-center justify-center ${
                          selectedIcon === icon.name ? 'bg-blue-100 text-blue-600' : ''
                        }`}
                        title={icon.name}
                      >
                        <IconComponent className="h-4 w-4" />
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function KeyPointForm({ keyPoint, mode, existingKeyPoints = [], onSuccess }: KeyPointFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: keyPoint?.title || '',
    icon: keyPoint?.icon || 'Star',
    position: keyPoint?.position || 1,
    is_active: keyPoint?.is_active ?? true
  });

  // Get available positions (positions 1-4 that are not taken by other key points)
  const getAvailablePositions = () => {
    const takenPositions = existingKeyPoints
      .filter(kp => kp.key_point_id !== keyPoint?.key_point_id) // Exclude current key point if editing
      .map(kp => kp.position);
    
    return [1, 2, 3, 4].filter(position => !takenPositions.includes(position));
  };

  const availablePositions = getAvailablePositions();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('Auth error:', authError);
        alert('Authentication error: ' + authError.message);
        return;
      }
      
      if (!user) {
        console.log('No user found');
        alert('Not authenticated');
        return;
      }

      if (mode === 'create') {
        const { error } = await supabase
          .from('PartnerKeyPoints')
          .insert({
            partner_id: user.id,
            ...formData
          });

        if (error) {
          console.error('Error creating key point:', error);
          alert('Failed to create key point');
          return;
        }
      } else if (keyPoint) {
        const { error } = await supabase
          .from('PartnerKeyPoints')
          .update(formData)
          .eq('key_point_id', keyPoint.key_point_id);

        if (error) {
          console.error('Error updating key point:', error);
          alert('Failed to update key point');
          return;
        }
      }

      if (onSuccess) {
        onSuccess();
      }
      setIsOpen(false);
      setFormData({
        title: '',
        icon: 'Star',
        position: 1,
        is_active: true
      });
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              name === 'position' ? parseInt(value) : value
    }));
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <Plus className="h-4 w-4 mr-2" />
        {mode === 'create' ? 'Add Key Point' : 'Edit'}
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {mode === 'create' ? 'Add Key Point' : 'Edit Key Point'}
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter key point title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Icon
                  </label>
                  <IconPicker
                    selectedIcon={formData.icon}
                    onIconSelect={(icon) => setFormData(prev => ({ ...prev, icon }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position
                  </label>
                  {availablePositions.length > 0 ? (
                    <select
                      name="position"
                      value={formData.position}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {availablePositions.map(position => (
                        <option key={position} value={position}>
                          Position {position}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                      All positions are taken. Please delete a key point first.
                    </div>
                  )}
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Active
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || availablePositions.length === 0}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : (mode === 'create' ? 'Create' : 'Update')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
