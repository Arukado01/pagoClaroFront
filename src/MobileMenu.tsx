import { useEffect, useState } from 'react';
import { Dialog } from 'radix-ui';
import { LayoutDashboard, LogOut, Menu, UsersRound, X } from 'lucide-react';
import { Preferences, tr } from './i18n';
import './mobile-menu.css';

type Screen = 'orders' | 'admin';

interface MobileMenuProps {
  screen: Screen;
  onNavigate: (screen: Screen) => void;
  isAdmin: boolean;
  username?: string;
  onLogout: () => void;
}

/** Mobile-only navigation, with Radix managing focus, Escape and scroll locking. */
export default function MobileMenu({ screen, onNavigate, isAdmin, username, onLogout }: MobileMenuProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 761px)');
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);

  function navigate(destination: Screen) {
    onNavigate(destination);
    setOpen(false);
  }

  return <Dialog.Root open={open} onOpenChange={setOpen}>
    <Dialog.Trigger asChild>
      <button className="mobile-menu-trigger" type="button" aria-label={tr('Abrir menú')}>
        <Menu size={21} aria-hidden="true" />
      </button>
    </Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="mobile-menu-overlay" />
      <Dialog.Content className="mobile-menu-panel" aria-describedby={undefined}>
        <div className="mobile-menu-heading">
          <Dialog.Title>{tr('Navegación principal')}</Dialog.Title>
          <Dialog.Close asChild>
            <button className="mobile-menu-close" type="button" aria-label={tr('Cerrar')}>
              <X size={20} aria-hidden="true" />
            </button>
          </Dialog.Close>
        </div>
        <nav className="mobile-menu-links" aria-label={tr('Navegación principal')}>
          <button type="button" aria-current={screen === 'orders' ? 'page' : undefined} onClick={() => navigate('orders')}>
            <LayoutDashboard size={18} aria-hidden="true" />{tr('Órdenes')}
          </button>
          {isAdmin && <button type="button" aria-current={screen === 'admin' ? 'page' : undefined} onClick={() => navigate('admin')}>
            <UsersRound size={18} aria-hidden="true" />{tr('Usuarios y roles')}
          </button>}
        </nav>
        <div className="mobile-menu-preferences"><Preferences /></div>
        <div className="mobile-menu-account">
          <strong>{username || tr('Usuario')}</strong>
          <button type="button" onClick={() => { setOpen(false); onLogout(); }}>
            <LogOut size={18} aria-hidden="true" />{tr('Cerrar sesión')}
          </button>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
