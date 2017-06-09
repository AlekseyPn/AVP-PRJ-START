'use strict'

$('.slider__wrapper').slick({
    dots: true,
    dotsClass: 'slider__dots',
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: true,
    autoplay: true,
    autoplaySpeed: 4000,
    prevArrow: '<button type="button" class="slider__button  slider__button--prev">&lsaquo;</button>',
    nextArrow: '<button type="button" class="slider__button  slider__button--next">&rsaquo;</button>'
})