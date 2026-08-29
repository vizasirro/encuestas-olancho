'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function VizaLoginLink() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== '/login') return;
    const form = document.querySelector('form');
    const submit = form?.querySelector('button[type="submit"]');
    if (!form || !submit || document.getElementById('viza-login-link')) return;

    const link = document.createElement('a');
    link.id = 'viza-login-link';
    link.href = 'https://x.com/victorzepedaa';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', 'Abrir perfil ViZA en X');
    link.style.cssText = 'display:flex;justify-content:center;align-items:center;margin:10px auto 0;width:58px;height:58px;text-decoration:none;';

    const img = document.createElement('img');
    img.src = '/viza-logo.svg';
    img.alt = 'ViZA';
    img.style.cssText = 'display:block;width:58px;height:58px;object-fit:contain;';
    link.appendChild(img);
    submit.insertAdjacentElement('afterend', link);

    return () => link.remove();
  }, [pathname]);

  return null;
}
