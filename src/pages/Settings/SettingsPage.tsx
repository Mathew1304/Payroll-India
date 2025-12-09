import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Palette, Moon, Sun, Sparkles, Check, Globe, Type, Save } from 'lucide-react';
import { MasterDataManager } from '../../components/Settings/MasterDataManager';
import { useTheme } from '../../contexts/ThemeContext';

const themes = [
  {
    id: 'light' as const,
    name: 'Light Modern',
    description: 'Clean and bright interface',
    icon: Sun,
    preview: {
      primary: 'from-blue-500 to-blue-600',
      secondary: 'from-slate-50 to-white',
      accent: 'bg-blue-100'
    }
  },
  {
    id: 'dark' as const,
    name: 'Dark Glossy',
    description: 'Sleek dark theme with glass effects',
    icon: Moon,
    preview: {
      primary: 'from-slate-900 to-black',
      secondary: 'from-slate-800 to-slate-900',
      accent: 'bg-slate-700'
    }
  },
  {
    id: 'midnight' as const,
    name: 'Midnight Black',
    description: 'Pure black with vibrant accents',
    icon: Moon,
    preview: {
      primary: 'from-black to-slate-950',
      secondary: 'from-slate-950 to-black',
      accent: 'bg-blue-500'
    }
  },
  {
    id: 'neon' as const,
    name: 'Neon Glow',
    description: 'Dark theme with glowing elements',
    icon: Sparkles,
    preview: {
      primary: 'from-violet-600 to-fuchsia-600',
      secondary: 'from-slate-900 to-slate-800',
      accent: 'bg-violet-500'
    }
  }
];

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'master-data'>('appearance');
  const [selectedFont, setSelectedFont] = useState('inter');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [timeFormat, setTimeFormat] = useState('12-hour');
  const [currency, setCurrency] = useState('INR');
  const [language, setLanguage] = useState('English');
  const [hasChanges, setHasChanges] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  useEffect(() => {
    const savedFont = localStorage.getItem('fontFamily') || 'inter';
    const savedDateFormat = localStorage.getItem('dateFormat') || 'DD/MM/YYYY';
    const savedTimeFormat = localStorage.getItem('timeFormat') || '12-hour';
    const savedCurrency = localStorage.getItem('currency') || 'INR';
    const savedLanguage = localStorage.getItem('language') || 'English';

    setSelectedFont(savedFont);
    setDateFormat(savedDateFormat);
    setTimeFormat(savedTimeFormat);
    setCurrency(savedCurrency);
    setLanguage(savedLanguage);

    applyFont(savedFont);
  }, []);

  const applyFont = (font: string) => {
    const fontMap: Record<string, string> = {
      'inter': 'Inter, sans-serif',
      'roboto': 'Roboto, sans-serif',
      'poppins': 'Poppins, sans-serif',
      'lato': 'Lato, sans-serif',
      'open-sans': '"Open Sans", sans-serif',
      'montserrat': 'Montserrat, sans-serif',
      'raleway': 'Raleway, sans-serif',
      'nunito': 'Nunito, sans-serif',
      'work-sans': '"Work Sans", sans-serif',
      'ubuntu': 'Ubuntu, sans-serif'
    };
    document.documentElement.style.fontFamily = fontMap[font] || fontMap['inter'];
  };

  const handleFontChange = (font: string) => {
    setSelectedFont(font);
    setHasChanges(true);
  };

  const handleSaveChanges = () => {
    localStorage.setItem('fontFamily', selectedFont);
    localStorage.setItem('dateFormat', dateFormat);
    localStorage.setItem('timeFormat', timeFormat);
    localStorage.setItem('currency', currency);
    localStorage.setItem('language', language);

    applyFont(selectedFont);
    setHasChanges(false);
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-theme-text-primary to-theme-text-secondary bg-clip-text text-transparent flex items-center gap-3">
            <SettingsIcon className="h-8 w-8 text-theme-primary" />
            Settings
          </h1>
          <p className="text-theme-text-secondary mt-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-theme-primary" />
            Customize your experience and manage system settings
          </p>
        </div>
      </div>

      <div className="bg-theme-bg-secondary rounded-2xl shadow-lg border border-theme-border overflow-hidden transition-colors duration-300">
        <div className="border-b border-theme-border">
          <nav className="flex space-x-8 px-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('appearance')}
              className={`${activeTab === 'appearance'
                  ? 'border-theme-primary text-theme-primary'
                  : 'border-transparent text-theme-text-secondary hover:text-theme-text-primary hover:border-theme-border'
                } flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              <Palette className="h-4 w-4" />
              Appearance
            </button>
            <button
              onClick={() => setActiveTab('general')}
              className={`${activeTab === 'general'
                  ? 'border-theme-primary text-theme-primary'
                  : 'border-transparent text-theme-text-secondary hover:text-theme-text-primary hover:border-theme-border'
                } flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              <Globe className="h-4 w-4" />
              General
            </button>
            <button
              onClick={() => setActiveTab('master-data')}
              className={`${activeTab === 'master-data'
                  ? 'border-theme-primary text-theme-primary'
                  : 'border-transparent text-theme-text-secondary hover:text-theme-text-primary hover:border-theme-border'
                } flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              <SettingsIcon className="h-4 w-4" />
              Master Data
            </button>
          </nav>
        </div>

        <div className="p-8">
          {activeTab === 'appearance' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-theme-text-primary mb-2">Choose Your Theme</h2>
                <p className="text-theme-text-secondary">Select a theme that matches your style and workflow</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {themes.map((themeOption) => {
                  const Icon = themeOption.icon;
                  const isSelected = theme === themeOption.id;

                  return (
                    <button
                      key={themeOption.id}
                      onClick={() => setTheme(themeOption.id)}
                      className={`relative group text-left p-6 rounded-2xl border-2 transition-all duration-300 ${isSelected
                          ? 'border-theme-primary shadow-xl shadow-theme-primary/10'
                          : 'border-theme-border hover:border-theme-text-secondary hover:shadow-lg'
                        }`}
                    >
                      {isSelected && (
                        <div className="absolute top-4 right-4 h-8 w-8 bg-theme-primary rounded-full flex items-center justify-center shadow-lg">
                          <Check className="h-5 w-5 text-white" />
                        </div>
                      )}

                      <div className="flex items-center gap-3 mb-4">
                        <div className={`h-12 w-12 bg-gradient-to-br ${themeOption.preview.primary} rounded-xl flex items-center justify-center shadow-lg`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-theme-text-primary text-lg">{themeOption.name}</h3>
                          <p className="text-sm text-theme-text-secondary">{themeOption.description}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className={`h-20 bg-gradient-to-br ${themeOption.preview.primary} rounded-xl relative overflow-hidden`}>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                          <div className="absolute bottom-3 left-3 right-3 flex gap-2">
                            <div className="h-2 w-16 bg-white/30 rounded-full backdrop-blur-sm"></div>
                            <div className="h-2 w-12 bg-white/20 rounded-full backdrop-blur-sm"></div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className={`h-12 bg-gradient-to-br ${themeOption.preview.secondary} rounded-lg border border-theme-border`}></div>
                          <div className={`h-12 ${themeOption.preview.accent} rounded-lg`}></div>
                          <div className={`h-12 bg-gradient-to-br ${themeOption.preview.secondary} rounded-lg border border-theme-border`}></div>
                        </div>
                      </div>

                      <div className={`mt-4 py-2 px-4 rounded-lg text-center font-medium transition-colors ${isSelected
                          ? 'bg-theme-primary text-white'
                          : 'bg-theme-bg-primary text-theme-text-secondary group-hover:bg-theme-border'
                        }`}>
                        {isSelected ? 'Active Theme' : 'Select Theme'}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="bg-gradient-to-br from-theme-bg-primary to-theme-bg-secondary border-2 border-theme-border rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 bg-theme-primary rounded-xl flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-theme-text-primary text-lg mb-2">Premium Themes Coming Soon</h3>
                    <p className="text-theme-text-secondary text-sm mb-4">
                      Get access to exclusive themes with advanced customization options, including custom color palettes,
                      glassmorphism effects, and animated backgrounds.
                    </p>
                    <button className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-opacity-90 transition-colors font-medium text-sm">
                      Learn More
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t border-theme-border pt-6">
                <h3 className="font-bold text-theme-text-primary mb-4">Theme Settings</h3>
                <div className="space-y-4">
                  <label className="flex items-center justify-between p-4 bg-theme-bg-primary rounded-xl hover:bg-theme-border transition-colors cursor-pointer">
                    <div>
                      <p className="font-medium text-theme-text-primary">Auto Dark Mode</p>
                      <p className="text-sm text-theme-text-secondary">Automatically switch based on system preferences</p>
                    </div>
                    <input type="checkbox" className="h-5 w-5 text-theme-primary rounded border-theme-border focus:ring-theme-primary" />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-theme-bg-primary rounded-xl hover:bg-theme-border transition-colors cursor-pointer">
                    <div>
                      <p className="font-medium text-theme-text-primary">Reduced Motion</p>
                      <p className="text-sm text-theme-text-secondary">Minimize animations and transitions</p>
                    </div>
                    <input type="checkbox" className="h-5 w-5 text-theme-primary rounded border-theme-border focus:ring-theme-primary" />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-theme-bg-primary rounded-xl hover:bg-theme-border transition-colors cursor-pointer">
                    <div>
                      <p className="font-medium text-theme-text-primary">High Contrast</p>
                      <p className="text-sm text-theme-text-secondary">Increase contrast for better readability</p>
                    </div>
                    <input type="checkbox" className="h-5 w-5 text-theme-primary rounded border-theme-border focus:ring-theme-primary" />
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-theme-text-primary mb-2">General Settings</h2>
                  <p className="text-theme-text-secondary">Configure basic system preferences</p>
                </div>
                {hasChanges && (
                  <button
                    onClick={handleSaveChanges}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl hover:from-emerald-700 hover:to-emerald-800 shadow-lg transition-all"
                  >
                    <Save className="h-5 w-5" />
                    Save Changes
                  </button>
                )}
              </div>

              {showSaveSuccess && (
                <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl flex items-center gap-3">
                  <div className="h-10 w-10 bg-emerald-500 rounded-full flex items-center justify-center">
                    <Check className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-emerald-900">Settings Saved Successfully!</p>
                    <p className="text-sm text-emerald-700">Your preferences have been applied.</p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="p-6 bg-theme-bg-secondary border-2 border-theme-border rounded-xl">
                  <label className="block mb-2">
                    <span className="text-sm font-semibold text-theme-text-secondary">Date Format</span>
                  </label>
                  <select
                    value={dateFormat}
                    onChange={(e) => { setDateFormat(e.target.value); setHasChanges(true); }}
                    className="w-full px-4 py-3 bg-theme-bg-primary text-theme-text-primary border-2 border-theme-border rounded-xl focus:ring-2 focus:ring-theme-primary focus:border-theme-primary"
                  >
                    <option>DD/MM/YYYY</option>
                    <option>MM/DD/YYYY</option>
                    <option>YYYY-MM-DD</option>
                  </select>
                </div>

                <div className="p-6 bg-theme-bg-secondary border-2 border-theme-border rounded-xl">
                  <label className="block mb-2">
                    <span className="text-sm font-semibold text-theme-text-secondary">Time Format</span>
                  </label>
                  <select
                    value={timeFormat}
                    onChange={(e) => { setTimeFormat(e.target.value); setHasChanges(true); }}
                    className="w-full px-4 py-3 bg-theme-bg-primary text-theme-text-primary border-2 border-theme-border rounded-xl focus:ring-2 focus:ring-theme-primary focus:border-theme-primary"
                  >
                    <option value="12-hour">12-hour (AM/PM)</option>
                    <option value="24-hour">24-hour</option>
                  </select>
                </div>

                <div className="p-6 bg-theme-bg-secondary border-2 border-theme-border rounded-xl">
                  <label className="block mb-2">
                    <span className="text-sm font-semibold text-theme-text-secondary">Currency</span>
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => { setCurrency(e.target.value); setHasChanges(true); }}
                    className="w-full px-4 py-3 bg-theme-bg-primary text-theme-text-primary border-2 border-theme-border rounded-xl focus:ring-2 focus:ring-theme-primary focus:border-theme-primary"
                  >
                    <option value="QAR">QAR (Qatar Riyal)</option>
                    <option value="SAR">SAR (Saudi Riyal)</option>
                    <option value="AED">AED (UAE Dirham)</option>
                    <option value="USD">USD (US Dollar)</option>
                  </select>
                </div>

                <div className="p-6 bg-theme-bg-secondary border-2 border-theme-border rounded-xl">
                  <label className="block mb-2">
                    <span className="text-sm font-semibold text-theme-text-secondary flex items-center gap-2">
                      <Type className="h-4 w-4" />
                      Font Family
                    </span>
                  </label>
                  <select
                    value={selectedFont}
                    onChange={(e) => handleFontChange(e.target.value)}
                    className="w-full px-4 py-3 bg-theme-bg-primary text-theme-text-primary border-2 border-theme-border rounded-xl focus:ring-2 focus:ring-theme-primary focus:border-theme-primary"
                  >
                    <option value="inter" style={{ fontFamily: 'Inter, sans-serif' }}>Inter (Default)</option>
                    <option value="roboto" style={{ fontFamily: 'Roboto, sans-serif' }}>Roboto</option>
                    <option value="poppins" style={{ fontFamily: 'Poppins, sans-serif' }}>Poppins</option>
                    <option value="lato" style={{ fontFamily: 'Lato, sans-serif' }}>Lato</option>
                    <option value="open-sans" style={{ fontFamily: '"Open Sans", sans-serif' }}>Open Sans</option>
                    <option value="montserrat" style={{ fontFamily: 'Montserrat, sans-serif' }}>Montserrat</option>
                    <option value="raleway" style={{ fontFamily: 'Raleway, sans-serif' }}>Raleway</option>
                    <option value="nunito" style={{ fontFamily: 'Nunito, sans-serif' }}>Nunito</option>
                    <option value="work-sans" style={{ fontFamily: '"Work Sans", sans-serif' }}>Work Sans</option>
                    <option value="ubuntu" style={{ fontFamily: 'Ubuntu, sans-serif' }}>Ubuntu</option>
                  </select>
                  <p className="mt-2 text-xs text-theme-text-secondary">Choose a font that matches your brand and enhances readability</p>

                  <div className="mt-4 p-4 bg-gradient-to-r from-theme-bg-primary to-theme-bg-secondary border-2 border-theme-border rounded-xl" style={{ fontFamily: selectedFont === 'inter' ? 'Inter, sans-serif' : selectedFont === 'roboto' ? 'Roboto, sans-serif' : selectedFont === 'poppins' ? 'Poppins, sans-serif' : selectedFont === 'lato' ? 'Lato, sans-serif' : selectedFont === 'open-sans' ? '"Open Sans", sans-serif' : selectedFont === 'montserrat' ? 'Montserrat, sans-serif' : selectedFont === 'raleway' ? 'Raleway, sans-serif' : selectedFont === 'nunito' ? 'Nunito, sans-serif' : selectedFont === 'work-sans' ? '"Work Sans", sans-serif' : selectedFont === 'ubuntu' ? 'Ubuntu, sans-serif' : 'Inter, sans-serif' }}>
                    <p className="text-sm font-semibold text-theme-primary mb-2">Font Preview</p>
                    <p className="text-lg text-theme-text-primary mb-1">The quick brown fox jumps over the lazy dog</p>
                    <p className="text-sm text-theme-text-secondary">ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789</p>
                  </div>
                </div>

                <div className="p-6 bg-theme-bg-secondary border-2 border-theme-border rounded-xl">
                  <label className="block mb-2">
                    <span className="text-sm font-semibold text-theme-text-secondary">Language</span>
                  </label>
                  <select
                    value={language}
                    onChange={(e) => { setLanguage(e.target.value); setHasChanges(true); }}
                    className="w-full px-4 py-3 bg-theme-bg-primary text-theme-text-primary border-2 border-theme-border rounded-xl focus:ring-2 focus:ring-theme-primary focus:border-theme-primary"
                  >
                    <option>English</option>
                    <option>Hindi</option>
                    <option>Spanish</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'master-data' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-theme-text-primary mb-2">Master Data Management</h2>
                <p className="text-theme-text-secondary">Configure departments, designations, and branches</p>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Quick Setup</h3>
                <p className="text-sm text-blue-800 mb-4">
                  Before adding employees, make sure to set up at least one department, designation, and branch.
                  These will be used when creating employee records.
                </p>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                    Departments: Organize employees by department (IT, HR, Sales, etc.)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                    Designations: Job titles and positions (Manager, Developer, etc.)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                    Branches: Office locations where employees work
                  </li>
                </ul>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <MasterDataManager type="departments" title="Departments" />
                <MasterDataManager type="designations" title="Designations" />
                <MasterDataManager type="branches" title="Branches" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
