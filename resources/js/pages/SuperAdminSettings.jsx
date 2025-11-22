import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Save, RefreshCw, Palette, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { useToastContext } from '../contexts/ToastContext';

export default function SuperAdminSettings() {
  const toast = useToastContext();
  const queryClient = useQueryClient();
  
  const [colors, setColors] = useState({
    primary_color: '#1E3A5F',
    secondary_color: '#86EFAC',
    accent_color: '#FFFFFF',
  });

  // Fetch current theme
  const { data: currentTheme, isLoading } = useQuery({
    queryKey: ['super-admin-theme'],
    queryFn: async () => {
      const response = await api.get('/system-settings/super-admin-theme');
      return response.data.data;
    },
  });

  // Update colors when theme loads
  useEffect(() => {
    if (currentTheme) {
      setColors({
        primary_color: currentTheme.primary_color || '#1E3A5F',
        secondary_color: currentTheme.secondary_color || '#86EFAC',
        accent_color: currentTheme.accent_color || '#FFFFFF',
      });
    }
  }, [currentTheme]);

  // Save theme mutation
  const saveMutation = useMutation({
    mutationFn: async (themeColors) => {
      const response = await api.put('/system-settings/super-admin-theme', themeColors);
      return response.data;
    },
    onSuccess: (data) => {
      toast.showToast('Super admin theme colors updated successfully!', 'success');
      queryClient.invalidateQueries(['super-admin-theme']);
      // Reload the page to apply theme changes
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    },
    onError: (error) => {
      toast.showToast(
        error.response?.data?.error || 'Failed to update theme colors',
        'error'
      );
    },
  });

  const handleColorChange = (key, value) => {
    setColors(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = () => {
    saveMutation.mutate(colors);
  };

  const handleReset = () => {
    setColors({
      primary_color: '#1E3A5F',
      secondary_color: '#86EFAC',
      accent_color: '#FFFFFF',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--theme-primary)]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[var(--theme-primary)] rounded-xl shadow-lg p-6 text-[var(--theme-text-on-primary)]">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-white/20 rounded-lg">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-1">Super Admin Settings</h1>
            <p className="opacity-90">Configure system-wide settings and appearance</p>
          </div>
        </div>
      </div>

      {/* Theme Colors Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Palette className="w-6 h-6 text-[var(--theme-primary)]" />
          <h2 className="text-2xl font-semibold text-gray-900">Interface Color Scheme</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Primary Color */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Primary Color
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={colors.primary_color}
                onChange={(e) => handleColorChange('primary_color', e.target.value)}
                className="w-16 h-16 rounded-lg border-2 border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={colors.primary_color}
                onChange={(e) => handleColorChange('primary_color', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                placeholder="#1E3A5F"
              />
            </div>
            <p className="text-xs text-gray-500">
              Used for sidebar, buttons, and primary elements
            </p>
          </div>

          {/* Secondary Color */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Secondary Color
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={colors.secondary_color}
                onChange={(e) => handleColorChange('secondary_color', e.target.value)}
                className="w-16 h-16 rounded-lg border-2 border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={colors.secondary_color}
                onChange={(e) => handleColorChange('secondary_color', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                placeholder="#86EFAC"
              />
            </div>
            <p className="text-xs text-gray-500">
              Used for highlights and accents
            </p>
          </div>

          {/* Accent Color */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Accent Color
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={colors.accent_color}
                onChange={(e) => handleColorChange('accent_color', e.target.value)}
                className="w-16 h-16 rounded-lg border-2 border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={colors.accent_color}
                onChange={(e) => handleColorChange('accent_color', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                placeholder="#FFFFFF"
              />
            </div>
            <p className="text-xs text-gray-500">
              Used for backgrounds and light elements
            </p>
          </div>
        </div>

        {/* Preview */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Preview</h3>
          <div className="flex space-x-4">
            <div
              className="flex-1 p-4 rounded-lg text-white"
              style={{ backgroundColor: colors.primary_color }}
            >
              <div className="font-semibold mb-1">Primary</div>
              <div className="text-sm opacity-90">{colors.primary_color}</div>
            </div>
            <div
              className="flex-1 p-4 rounded-lg"
              style={{
                backgroundColor: colors.secondary_color,
                color: colors.secondary_color === '#FFFFFF' ? '#000' : '#000',
              }}
            >
              <div className="font-semibold mb-1">Secondary</div>
              <div className="text-sm opacity-70">{colors.secondary_color}</div>
            </div>
            <div
              className="flex-1 p-4 rounded-lg border border-gray-300"
              style={{ backgroundColor: colors.accent_color }}
            >
              <div className="font-semibold mb-1 text-gray-900">Accent</div>
              <div className="text-sm text-gray-600">{colors.accent_color}</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-4 mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reset to Default</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="px-6 py-2 text-sm font-medium text-white bg-[var(--theme-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saveMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>

        {/* Success Message */}
        {saveMutation.isSuccess && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-800">
              Theme colors updated successfully! The page will reload shortly to apply changes.
            </p>
          </div>
        )}

        {/* Error Message */}
        {saveMutation.isError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-800">
              {saveMutation.error?.response?.data?.error || 'Failed to update theme colors'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}




