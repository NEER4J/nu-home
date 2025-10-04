"use client";

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { PartnerHighlight } from '@/types/database.types';
import { 
  X, Save, Edit, 
  Info, CheckCircle, AlertTriangle, Gift, Megaphone,
  Star, Heart, Zap, Shield, Award, Target, TrendingUp,
  Users, Clock, MapPin, Phone, Mail, Globe, Settings,
  Lightbulb, Rocket, Crown, Diamond, Flame, Sparkles
} from 'lucide-react';

interface HighlightFormProps {
  highlight?: PartnerHighlight;
  mode: 'create' | 'edit';
  onSuccess?: () => void;
}

// Color picker component
const ColorPicker = ({ selectedColor, onColorSelect }: { selectedColor: string; onColorSelect: (color: string) => void }) => {
  const [customColor, setCustomColor] = useState(selectedColor || '#3B82F6');

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setCustomColor(color);
    if (color) {
      onColorSelect(color);
    }
  };

  const handleCustomColorSubmit = () => {
    if (customColor) {
      onColorSelect(customColor);
    }
  };

  return (
    <div className="space-y-3">
      {/* Custom Color Picker */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Choose Color
        </label>
        <div className="flex items-center space-x-2">
          <div className="flex-1">
            <input
              type="color"
              value={customColor || '#3B82F6'}
              onChange={handleCustomColorChange}
              className="w-full h-10 border border-gray-300 rounded-md cursor-pointer"
            />
          </div>
          <input
            type="text"
            value={customColor}
            onChange={(e) => setCustomColor(e.target.value)}
            placeholder="#3B82F6"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={handleCustomColorSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Selected Color Display */}
      <div className="flex items-center justify-center space-x-2">
        <div className="text-sm text-gray-500">Selected:</div>
        <div className="flex items-center space-x-2">
          <div 
            className="w-6 h-6 rounded-full border-2 border-gray-300" 
            style={{ backgroundColor: selectedColor || '#3B82F6' }}
          ></div>
          <span className="text-sm font-medium text-gray-700">{selectedColor || '#3B82F6'}</span>
        </div>
      </div>
    </div>
  );
};

// Icon picker component
const IconPicker = ({ selectedIcon, onIconSelect }: { selectedIcon: string; onIconSelect: (icon: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const iconOptions = [
    { name: 'Info', component: Info, category: 'Basic' },
    { name: 'CheckCircle', component: CheckCircle, category: 'Basic' },
    { name: 'AlertTriangle', component: AlertTriangle, category: 'Basic' },
    { name: 'Gift', component: Gift, category: 'Basic' },
    { name: 'Megaphone', component: Megaphone, category: 'Basic' },
    { name: 'Star', component: Star, category: 'Popular' },
    { name: 'Heart', component: Heart, category: 'Popular' },
    { name: 'Zap', component: Zap, category: 'Popular' },
    { name: 'Shield', component: Shield, category: 'Popular' },
    { name: 'Award', component: Award, category: 'Achievement' },
    { name: 'Target', component: Target, category: 'Achievement' },
    { name: 'TrendingUp', component: TrendingUp, category: 'Achievement' },
    { name: 'Users', component: Users, category: 'Social' },
    { name: 'Clock', component: Clock, category: 'Time' },
    { name: 'MapPin', component: MapPin, category: 'Location' },
    { name: 'Phone', component: Phone, category: 'Contact' },
    { name: 'Mail', component: Mail, category: 'Contact' },
    { name: 'Globe', component: Globe, category: 'Web' },
    { name: 'Settings', component: Settings, category: 'Tools' },
    { name: 'Lightbulb', component: Lightbulb, category: 'Ideas' },
    { name: 'Rocket', component: Rocket, category: 'Ideas' },
    { name: 'Crown', component: Crown, category: 'Premium' },
    { name: 'Diamond', component: Diamond, category: 'Premium' },
    { name: 'Flame', component: Flame, category: 'Energy' },
    { name: 'Sparkles', component: Sparkles, category: 'Magic' }
  ];

  const selectedIconData = iconOptions.find(icon => icon.name === selectedIcon);
  const SelectedIconComponent = selectedIconData?.component || Info;

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
              <div className="grid grid-cols-4 gap-1 p-2">
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

export default function HighlightForm({ highlight, mode, onSuccess }: HighlightFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false); 
  const [formData, setFormData] = useState({
    title: highlight?.title || '',
    message: highlight?.message || '',
    is_active: highlight?.is_active ?? true,
    priority: highlight?.priority || 0,
    start_date: highlight?.start_date ? highlight.start_date.split('T')[0] : '',
    end_date: highlight?.end_date ? highlight.end_date.split('T')[0] : '',
    icon: highlight?.icon || 'Info',
    color_scheme: highlight?.color_scheme || '#3B82F6'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('Not authenticated');
        return;
      }

              const submitData = {
                ...formData,
                start_date: formData.start_date || null,
                end_date: formData.end_date || null
              };

      if (mode === 'create') {
        const { error } = await supabase
          .from('PartnerHighlights')
          .insert({
            partner_id: user.id,
            ...submitData
          });

        if (error) {
          console.error('Error creating highlight:', error);
          alert('Failed to create highlight');
          return;
        }
      } else if (highlight) {
        const { error } = await supabase
          .from('PartnerHighlights')
          .update(submitData)
          .eq('highlight_id', highlight.highlight_id);

        if (error) {
          console.error('Error updating highlight:', error);
          alert('Failed to update highlight');
          return;
        }
      }

      if (onSuccess) {
        onSuccess();
      }
      setIsOpen(false);
      setFormData({
        title: '',
        message: '',
        is_active: true,
        priority: 0,
        start_date: '',
        end_date: '',
        icon: 'Info',
        color_scheme: '#3B82F6'
      });
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
      >
        {mode === 'create' ? (
          <>
            <Save className="h-4 w-4 mr-2" />
            Add Highlight
          </>
        ) : (
          <Edit className="h-4 w-4" />
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {mode === 'create' ? 'Create New Highlight' : 'Edit Highlight'}
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
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter highlight title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message *
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter highlight message"
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
                  Color Scheme
                </label>
                <ColorPicker
                  selectedColor={formData.color_scheme}
                  onColorSelect={(color) => setFormData(prev => ({ ...prev, color_scheme: color }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <input
                    type="number"
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
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
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (mode === 'create' ? 'Create' : 'Update')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
