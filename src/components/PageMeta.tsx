import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
export function PageMeta() {
  const {pathname} = useLocation();
  useEffect(() => {
    const titles = {'/':'CUET ETE Routine | Class Schedule & Academic Calendar','/teachers':'CUET ETE Teacher Schedules | ETE Routine','/rooms':'CUET ETE Room & Lab Schedules | ETE Routine','/display':'CUET ETE Academic Calendar Display'};
    document.title = titles[pathname] || (pathname.startsWith('/admin') ? 'Admin Workspace | CUET ETE Routine' : 'Page Not Found | CUET ETE Routine');
    const meta = (name: string, value: string) => {let node = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`); if (!node) {node=document.createElement('meta');node.name=name;document.head.appendChild(node);}node.content=value;};
    const descriptions = {'/':'Find CUET ETE class routines by batch, academic dates, holidays, teacher schedules and room availability.','/teachers':'Find CUET ETE teacher class schedules across active batches and download printable routines.','/rooms':'Browse CUET ETE room and laboratory schedules, class times and batch assignments.'};
    meta('description',descriptions[pathname] || 'CUET ETE academic routine management.');
    meta('robots', ['/', '/teachers', '/rooms'].includes(pathname) ? 'index, follow' : 'noindex, nofollow');
    const existing = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const canonical = existing || document.createElement('link'); canonical.rel='canonical';
    const origin = import.meta.env.VITE_SITE_URL || window.location.origin;
    canonical.href = origin.replace(/\/$/,'') + pathname;
    if (!existing) document.head.appendChild(canonical);
  },[pathname]);
  return null;
}
