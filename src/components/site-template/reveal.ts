/**
 * Scroll reveal for a customer's website. An inline script, so nothing waits for React and nothing depends on hydration.
 * It marks only the parts of sections that start below the fold; those ease up into place the first time they scroll into view.
 * Parts already in view are never touched, so nothing flashes. Without JavaScript, IntersectionObserver or with reduced
 * motion the script does nothing, and every part simply shows. The look of the movement is in the stylesheet, per style.
 */
export const REVEAL_SCRIPT = `(function(){var s=document.currentScript,root=s&&s.parentElement;if(!root||!("IntersectionObserver"in window)||matchMedia("(prefers-reduced-motion: reduce)").matches)return;function go(){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.setAttribute("data-revealed","");io.unobserve(e.target)}})},{rootMargin:"0px 0px -6% 0px",threshold:0.08});var els=root.querySelectorAll("section > *");for(var i=0;i<els.length;i++){var el=els[i];if(el.closest("[data-variant]"))continue;if(el.getBoundingClientRect().top<innerHeight)continue;el.setAttribute("data-reveal","");io.observe(el)}}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",go);else go()})();`;
