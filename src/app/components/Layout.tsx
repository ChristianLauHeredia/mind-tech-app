import Link from 'next/link';

interface LayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: '🏠' },
  { name: 'Empleados', href: '/employees', icon: '👥' },
  { name: 'Buscar', href: '/search-matches', icon: '🔍' },
  { name: 'Solicitudes', href: '/requests', icon: '📋' },
  { name: 'Configuración', href: '/settings', icon: '⚙️' },
];

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Mind Tech</h1>
              <span className="ml-2 text-sm text-gray-500">App</span>
            </div>
            
            {/* Navigation */}
            <nav className="flex items-center space-x-1">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="flex flex-col items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200 min-[7656px]:px-2"
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="hidden sm:block min-[7656px]:block text-xs">{item.name}</span>
                </a>
              ))}
            </nav>
          
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="bg-gray-50 min-h-screen">
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}