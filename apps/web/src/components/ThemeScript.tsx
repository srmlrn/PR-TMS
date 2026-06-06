export function ThemeScript() {
  const script = `(function(){try{var t=localStorage.getItem('tms-theme');document.documentElement.setAttribute('data-theme',t==='dark'?'dark':'light');}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
