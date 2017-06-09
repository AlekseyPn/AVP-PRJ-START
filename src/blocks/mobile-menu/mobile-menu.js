var navMain = document.querySelector('.main-nav')

navMain.classList.remove("main-nav--no-js");//Удаляет класс --no-js если js в браузере включен.

var trigger = document.querySelector('.mobile-menu');

trigger.addEventListener('click', function() {
  if (trigger.classList.contains('mobile-menu--show')) {
    trigger.classList.remove('mobile-menu--show');
    navMain.classList.add('main-nav--close');
  } else {
    trigger.classList.add('mobile-menu--show');
    navMain.classList.remove('main-nav--close');
  };
});