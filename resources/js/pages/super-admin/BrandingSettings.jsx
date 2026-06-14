import React, { useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Palette, Upload, X, Image as ImageIcon } from 'lucide-react';
import api from '../../services/api';
import { useToastContext } from '../../contexts/ToastContext';

export default function BrandingSettings() {
  const toast = useToastContext();
  const queryClient = useQueryClient();
  const logoInputRef = useRef(null);
  const faviconInputRef = useRef(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [faviconPreview, setFaviconPreview] = useState(null);
  
  // Controlled state for form values - always initialize with defined values
  const [formValues, setFormValues] = useState(() => ({
    company_name: 'HomeLogic360',
    primary_color: '#1E3A5F',
    secondary_color: '#86EFAC',
    accent_color: '#FFFFFF',
  }));

  const { data: branding, isLoading } = useQuery({
    queryKey: ['super-admin-branding'],
    queryFn: async () => {
      const response = await api.get('/system-settings/branding');
      return response.data?.data || {};
    },
  });

  // Track if we just saved to prevent useEffect from overwriting
  const justSavedRef = React.useRef(false);

  // Update form values when branding data changes (but not right after save)
  React.useEffect(() => {
    if (branding && !justSavedRef.current && Object.keys(branding).length > 0) {
      setFormValues((prev) => ({
        company_name: branding.company_name ?? prev.company_name ?? 'HomeLogic360',
        primary_color: branding.primary_color ?? prev.primary_color ?? '#1E3A5F',
        secondary_color: branding.secondary_color ?? prev.secondary_color ?? '#86EFAC',
        accent_color: branding.accent_color ?? prev.accent_color ?? '#FFFFFF',
      }));
    }
  }, [branding]);

  const defaultValues = useMemo(
    () => ({
      company_name: branding?.company_name || 'HomeLogic360',
      primary_color: branding?.primary_color || '#1E3A5F',
      secondary_color: branding?.secondary_color || '#86EFAC',
      accent_color: branding?.accent_color || '#FFFFFF',
      logo_url: branding?.logo_url || null,
      favicon_url: branding?.favicon_url || null,
    }),
    [branding]
  );

  const saveMutation = useMutation({
    mutationFn: async (formData) => {
      const response = await api.put('/system-settings/branding', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      // response.data is { data: { ... } }, so return the inner data
      return response.data?.data || response.data;
    },
    onSuccess: (brandingData) => {
      toast.showToast('Branding settings updated successfully.', 'success', { isFormSubmission: true });
      
      // Prevent useEffect from overwriting our form values for a while
      justSavedRef.current = true;
      
      // DON'T update formValues - they already have the correct values we just saved
      // Just update the query cache with the response (or our formValues if response is incomplete)
      const cacheData = brandingData && brandingData.primary_color ? brandingData : {
        company_name: formValues.company_name,
        primary_color: formValues.primary_color,
        secondary_color: formValues.secondary_color,
        accent_color: formValues.accent_color,
        logo_url: branding?.logo_url || brandingData?.logo_url,
        favicon_url: branding?.favicon_url || brandingData?.favicon_url,
        logo: branding?.logo || brandingData?.logo,
        favicon: branding?.favicon || brandingData?.favicon,
      };
      
      queryClient.setQueryData(['super-admin-branding'], cacheData);
      
      // Reset the flag after a delay to allow useEffect to work again on manual refresh
      setTimeout(() => {
        justSavedRef.current = false;
      }, 3000);
      
      setLogoPreview(null);
      setFaviconPreview(null);
    },
    onError: (error) => {
      toast.showToast(
        error.response?.data?.message || 'Failed to update branding settings',
        'error'
      );
    },
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData();
    
    // Add form values from state (ensures we use the current values)
    // Make sure colors are valid hex before sending
    const primaryColor = formValues.primary_color.match(/^#[0-9A-Fa-f]{6}$/) ? formValues.primary_color : '#1E3A5F';
    const secondaryColor = formValues.secondary_color.match(/^#[0-9A-Fa-f]{6}$/) ? formValues.secondary_color : '#86EFAC';
    const accentColor = formValues.accent_color.match(/^#[0-9A-Fa-f]{6}$/) ? formValues.accent_color : '#FFFFFF';
    
    formData.append('company_name', formValues.company_name || 'HomeLogic360');
    formData.append('primary_color', primaryColor);
    formData.append('secondary_color', secondaryColor);
    formData.append('accent_color', accentColor);
    
    // Only include logo if a new one was selected
    if (logoInputRef.current?.files?.[0]) {
      formData.append('logo', logoInputRef.current.files[0]);
    }
    
    // Only include favicon if a new one was selected
    if (faviconInputRef.current?.files?.[0]) {
      formData.append('favicon', faviconInputRef.current.files[0]);
    }

    saveMutation.mutate(formData);
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFaviconChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFaviconPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
    setLogoPreview(null);
  };

  const removeFavicon = () => {
    if (faviconInputRef.current) {
      faviconInputRef.current.value = '';
    }
    setFaviconPreview(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 flex items-center space-x-3">
        <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]">
          <Palette className="w-5 h-5" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Branding Settings</h1>
          <p className="text-sm text-gray-500">
            Customize your super admin branding including logo, colors, and company name.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-6">
        {/* Company Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Company Name
          </label>
          <input
            name="company_name"
            value={formValues.company_name}
            onChange={(e) => setFormValues({ ...formValues, company_name: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
            placeholder="HomeLogic360"
          />
          <p className="mt-1 text-xs text-gray-500">
            This name will be displayed throughout the super admin interface.
          </p>
        </div>

        {/* Logo Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Logo
          </label>
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              {(logoPreview || defaultValues.logo_url) && (
                <div className="relative">
                  <img
                    src={logoPreview || defaultValues.logo_url}
                    alt="Logo preview"
                    className="h-20 w-auto object-contain border border-gray-200 rounded-lg p-2 bg-gray-50"
                  />
                  {logoPreview && (
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="w-3 h-3" strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              )}
              {!logoPreview && !defaultValues.logo_url && (
                <div className="h-20 w-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                  <ImageIcon className="w-8 h-8 text-gray-400" strokeWidth={2.5} />
                </div>
              )}
            </div>
            <div className="flex-1">
              <input
                ref={logoInputRef}
                type="file"
                name="logo"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
                id="logo-upload"
              />
              <label
                htmlFor="logo-upload"
                className="inline-flex items-center px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm border border-gray-300 rounded-lg font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
              >
                <Upload className="w-4 h-4 mr-2" strokeWidth={2.5} />
                {logoPreview || defaultValues.logo_url ? 'Change Logo' : 'Upload Logo'}
              </label>
              <p className="mt-1 text-xs text-gray-500">
                Recommended: PNG or SVG, max 2MB. Logo will be displayed in the sidebar and header.
              </p>
            </div>
          </div>
        </div>

        {/* Favicon Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Favicon
          </label>
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              {(faviconPreview || defaultValues.favicon_url) && (
                <div className="relative">
                  <img
                    src={faviconPreview || defaultValues.favicon_url}
                    alt="Favicon preview"
                    className="h-16 w-16 object-contain border border-gray-200 rounded-lg p-2 bg-gray-50"
                  />
                  {faviconPreview && (
                    <button
                      type="button"
                      onClick={removeFavicon}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="w-3 h-3" strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              )}
              {!faviconPreview && !defaultValues.favicon_url && (
                <div className="h-16 w-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                  <ImageIcon className="w-6 h-6 text-gray-400" strokeWidth={2.5} />
                </div>
              )}
            </div>
            <div className="flex-1">
              <input
                ref={faviconInputRef}
                type="file"
                name="favicon"
                accept="image/*,.ico"
                onChange={handleFaviconChange}
                className="hidden"
                id="favicon-upload"
              />
              <label
                htmlFor="favicon-upload"
                className="inline-flex items-center px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm border border-gray-300 rounded-lg font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
              >
                <Upload className="w-4 h-4 mr-2" strokeWidth={2.5} />
                {faviconPreview || defaultValues.favicon_url ? 'Change Favicon' : 'Upload Favicon'}
              </label>
              <p className="mt-1 text-xs text-gray-500">
                Recommended: ICO or PNG, 32x32 or 16x16 pixels, max 512KB.
              </p>
            </div>
          </div>
        </div>

        {/* Color Settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-200">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary Color
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                id="primary_color_picker"
                value={formValues.primary_color}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setFormValues({ ...formValues, primary_color: newValue });
                }}
                className="h-10 w-20 border border-gray-300 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                id="primary_color_text"
                name="primary_color"
                value={formValues.primary_color}
                onChange={(e) => {
                  const newValue = e.target.value;
                  // Allow typing, but only update if it's a valid hex color
                  if (newValue === '' || /^#[0-9A-Fa-f]{0,6}$/.test(newValue)) {
                    setFormValues({ ...formValues, primary_color: newValue });
                  }
                }}
                onBlur={(e) => {
                  // Validate and fix on blur
                  const value = e.target.value;
                  if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
                    // Reset to last valid value or default
                    setFormValues({ ...formValues, primary_color: branding?.primary_color || '#1E3A5F' });
                  }
                }}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                placeholder="#1E3A5F"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Main brand color used in headers and primary buttons.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Secondary Color
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                id="secondary_color_picker"
                value={formValues.secondary_color}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setFormValues({ ...formValues, secondary_color: newValue });
                }}
                className="h-10 w-20 border border-gray-300 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                id="secondary_color_text"
                name="secondary_color"
                value={formValues.secondary_color}
                onChange={(e) => {
                  const newValue = e.target.value;
                  if (newValue === '' || /^#[0-9A-Fa-f]{0,6}$/.test(newValue)) {
                    setFormValues({ ...formValues, secondary_color: newValue });
                  }
                }}
                onBlur={(e) => {
                  const value = e.target.value;
                  if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
                    setFormValues({ ...formValues, secondary_color: branding?.secondary_color || '#86EFAC' });
                  }
                }}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                placeholder="#86EFAC"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Accent color for highlights and secondary elements.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Accent Color
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                id="accent_color_picker"
                value={formValues.accent_color}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setFormValues({ ...formValues, accent_color: newValue });
                }}
                className="h-10 w-20 border border-gray-300 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                id="accent_color_text"
                name="accent_color"
                value={formValues.accent_color}
                onChange={(e) => {
                  const newValue = e.target.value;
                  if (newValue === '' || /^#[0-9A-Fa-f]{0,6}$/.test(newValue)) {
                    setFormValues({ ...formValues, accent_color: newValue });
                  }
                }}
                onBlur={(e) => {
                  const value = e.target.value;
                  if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
                    setFormValues({ ...formValues, accent_color: branding?.accent_color || '#FFFFFF' });
                  }
                }}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                placeholder="#FFFFFF"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Text and icon color on primary backgrounds.
            </p>
          </div>
        </div>

        <div className="pt-4 mt-4 border-t border-gray-200 flex justify-end">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="inline-flex items-center justify-center px-3 py-2 text-xs sm:px-5 sm:py-2.5 sm:text-sm font-semibold rounded-lg bg-[var(--theme-primary)] text-white hover:bg-[var(--theme-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

