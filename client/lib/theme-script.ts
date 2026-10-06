/** Выполняется в <head> до отрисовки, чтобы страница не мигала светлой темой */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("phone-shop-theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}})()`;
