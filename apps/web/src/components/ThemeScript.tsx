export function ThemeScript() {
  const script = `(function(){try{var t=localStorage.getItem('tms-theme');document.documentElement.setAttribute('data-theme',t==='dark'?'dark':'light');if(localStorage.getItem('tms-dock-collapsed')==='1'){document.documentElement.dataset.dockCollapsed='true';}}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
