import { Settings as SettingsIcon, Palette, Moon, Sun, Sparkles, Check } from 'lucide-react';
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

export function EmployeeSettingsPage() {
    const { theme, setTheme } = useTheme();

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
                        Customize your experience
                    </p>
                </div>
            </div>

            <div className="bg-theme-bg-secondary rounded-2xl shadow-lg border border-theme-border overflow-hidden transition-colors duration-300">
                <div className="border-b border-theme-border">
                    <nav className="flex space-x-8 px-8" aria-label="Tabs">
                        <button
                            className="border-theme-primary text-theme-primary flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors"
                        >
                            <Palette className="h-4 w-4" />
                            Appearance
                        </button>
                    </nav>
                </div>

                <div className="p-8">
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
                    </div>
                </div>
            </div>
        </div>
    );
}
