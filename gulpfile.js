'use strict';

const filePath = {
    scss: 'scss/style.scss',
    img: 'img',
    js: 'js',
    jade: '*.jade',
    fonts: 'fonts'
}

const fs = require('fs');
const gulp = require('gulp')
const gulpSequence = require('gulp-sequence'); //Run series of gulp task order
const browserSync = require('browser-sync').create();

const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const mqpacker = require('css-mqpacker');
const atImport = require("postcss-import");
const cleanss = require('gulp-cleancss');
const inlineSVG = require('postcss-inline-svg');

const jade = require('gulp-jade');
const replace = require('gulp-replace');
const plumber = require('gulp-plumber');
const notify = require('gulp-notify');
const rename = require('gulp-rename');
const size = require('gulp-size');
const del = require('del');
const newer = require('gulp-newer');
const gulpIf = require('gulp-if');
const debug = require('gulp-debug');

let projectConfig = require('./projectConfig.json');
let dirs = projectConfig.dirs;
let lists = getFilesList(projectConfig);
const isDev = !process.env.NODE_ENV || process.env.NODE_ENV == 'dev';

let styleImports = '';
lists.css.forEach(function (blockPath) {
    styleImports += '@import \'' + blockPath + '\';\n';
});
fs.writeFileSync(dirs.source + 'scss/style.scss', styleImports);


let postCssPlugins = [
    autoprefixer({
        browsers: ['>2%']
    }),
    mqpacker({
        sort: true
    }),
    atImport(),
    inlineSVG()
];

gulp.task('clean', function () {
    console.log('Очищаем папку build');
    return del([
        dirs.build + '/**/*'
    ]);
});

gulp.task('style', function () {
    const sass = require('gulp-sass');
    const sourcemaps = require('gulp-sourcemaps');
    const wait = require('gulp-wait');
    console.log('Компиляция стилевых файлов');
    return gulp.src(dirs.source + filePath.scss)
        .pipe(plumber({
            errorHandler: function (err) {
                notify.onError({
                    title: 'Styles compilation error',
                    message: err.message
                })(err);
                this.emit('end');
            }
        }))
        .pipe(wait(100))
        .pipe(gulpIf(isDev, sourcemaps.init()))
        .pipe(debug())
        .pipe(sass())
        .pipe(postcss(postCssPlugins))
        .pipe(gulpIf(!isDev, cleanss()))
        .pipe(rename('style.min.css'))
        .pipe(gulpIf(isDev, sourcemaps.write('/')))
        .pipe(size({
            title: 'Размер',
            showFiles: true,
            showTotal: false,
        }))
        .pipe(gulp.dest(dirs.build + 'css'))
        .pipe(browserSync.stream({
            math: '**/*.css'
        }));
});

// Копирование animate.css если не нужно удалить из конфига singleCss
gulp.task('copy:animate', function (callback) {
    if (projectConfig.animateCss.length) {
        return gulp.src(projectConfig.animateCss)
            .pipe(postcss(postCssPlugins))
            .pipe(size({
                title: 'Размер',
                showFiles: true,
                showTotal: false
            }))
            .pipe(gulp.dest(dirs.build + '/css'))
            .pipe(browserSync());
    } else {
        callback();
    }
});

// Копирование изображений
gulp.task('copy:img', function () {
    console.log('Копирование изображений')
    return gulp.src(lists.img)
        .pipe(newer(dirs.build + 'img'))
        .pipe(size({
            title: 'Размер',
            showFiles: true,
            showTotal: false
        }))
        .pipe(gulp.dest(dirs.build + 'img'));
});

gulp.task('copy:js', function () {
    if (projectConfig.wowJS.length) {
        return gulp.src(projectConfig.wow)
            .pipe(size({
                title: 'Размер',
                showFiles: true,
                showTotal: false
            }))
            .pipe(uglify())
            .pipe(gulp.dest(dirs.build + 'js'))
    }
});

gulp.task('copy:css', function (callback) {
    if (projectConfig.copiedCss.length) {
        return gulp.src(projectConfig.copiedCss)
            .pipe(postcss(postCssPlugins))
            .pipe(cleanss())
            .pipe(size({
                title: 'Размер',
                showFiles: true,
                showTotal: false,
            }))
            .pipe(gulp.dest(dirs.build + '/css'))
            .pipe(browserSync.stream());
    } else {
        callback();
    }
});

gulp.task('copy:fonts', function () {
    console.log('Копирование шрифтов')
    return gulp.src(dirs.source + 'fonts/' + '*.{ttf,woff,woff2,eot,svg}')
        .pipe(newer(dirs.build + 'fonts'))
        .pipe(size({
            title: 'Размер',
            showFiles: true,
            showTotal: false
        }))
        .pipe(gulp.dest(dirs.build + 'fonts'))
});

let spriteSvgPath = dirs.source + dirs.blocksName + '/sprite-svg/svg';
// Сборка SVG Спрайта
gulp.task('sprite:svg', function (callback) {
    if ((projectConfig.blocks['sprite-svg']) !== undefined) {
        const svgstore = require('gulp-svgstore');
        const svgmin = require('gulp-svgmin');
        const cheerio = require('gulp-cheerio');
        if (fileExist(spriteSvgPath) !== false) {
            console.log('Сборка SVG Спрайта')
            return gulp.src(spriteSvgPath + '/*.svg')
                .pipe(svgmin(function (file) {
                    return {
                        plugins: [{
                            cleanupIDs: {
                                minify: true
                            }
                        }]
                    }
                }))
                .pipe(svgstore({
                    inlineSvg: true
                }))
                .pipe(cheerio(function ($) {
                    $('svg').attr('style', 'display:none');
                }))
                .pipe(rename('sprite-svg.svg'))
                .pipe(size({
                    title: 'Размер',
                    showFiles: true,
                    showTotal: false
                }))
                .pipe(gulp.dest(dirs.source + dirs.blocksName + '/sprite-svg/img/'))
        } else {
            console.log('Отмена ---> Нет папки с картинками!')
            callback()
        }
    } else {
        console.log('Сборка SVG спрайта: ОТМЕНА, блок не используется на проекте');
        callback();
    }
});

let spritePngPath = dirs.source + dirs.blocksName + '/sprite-png/png';
//Сборка PNG Спрайта
gulp.task('sprite:png', function (callback) {
    if ((projectConfig.blocks['sprite-png']) !== undefined) {
        const spritesmith = require('gulp.spritesmith');
        const buffer = require('vinyl-buffer');
        const merge = require('merge-stream');
        const imagemin = require('gulp-imagemin');
        const pngquant = require('imagemin-pngquant');        
        if (fileExist(spritePngPath) !== false) {
            console.log('Сборка PNG Спрайта')
            del(dirs.source + dirs.blockName + 'sprite-png/img/*.png');
            let fileName = 'sprite-' + Math.random().toString().replace(/[^0-9]/g, '') + '.png';                     
            let spriteData = gulp.src(spritePngPath + '/*.png')
                .pipe(spritesmith({
                    imgName: fileName,
                    cssName: 'sprite-png.scss',
                    padding: 4,
                    imgPath: '../img/' + fileName
                }));
            let imgStream = spriteData.img
                .pipe(buffer())
                .pipe(imagemin({
                    use: [pngquant()]
                }))
                .pipe(gulp.dest(dirs.source + dirs.blocksName + '/sprite-png/img/'));
            let cssStream = spriteData.css
                .pipe(gulp.dest(dirs.source + dirs.blocksName + '/sprite-png/'));
            return merge(imgStream, cssStream);
        } else {
            console.log('Отмена ---> Нет папки с картинками!')
            callback()
        }
    } else {
        console.log('Сборка SVG спрайта: ОТМЕНА, блок не используется на проекте');
        callback();
    }
});

//Сборка Jade
gulp.task('jade', function () {
    console.log('Компиляция Jade');
    return gulp.src([dirs.source + '*.jade'])
        .pipe(plumber({
            errorHandler: function (err) {
                notify.onError({
                    title: 'Jade compilation error',
                    message: err.message
                })(err);
                this.emit('end');
            }
        }))
        .pipe(jade({
            pretty: true
        }))        
        .pipe(gulp.dest(dirs.build));
});
// Сборка JS 
gulp.task('js', function (callback) {
    const uglify = require('gulp-uglify');
    const concat = require('gulp-concat');
    if (lists.js.length > 0) {
        console.log('Обработка JS');        
        return gulp.src(lists.js)
            .pipe(plumber({
                errorHandler: function (err) {
                    notify.onError({
                        title: 'JavaScript concat/uglify error',
                        message: err.message
                    })(err);
                    this.emit('end')
                }
            }))
            .pipe(concat('script.min.js'))
            .pipe(gulpIf(!isDev, uglify()))
            .pipe(size({
                title: 'Размер',
                showFiles: true,
                showTotal: false,
            }))
            .pipe(gulp.dest(dirs.build + '/js'));
    } else {
        console.log('Сборка JS файлов ОТМЕНА: в потоке нет JS файлов');
        callback();
    }
});

//Оптимизация изображений

const folder = process.env.folder;

gulp.task('img:opt', function (callback) {
    const imagemin = require('gulp-imagemin');
    const pngquant = require('imagemin-pngquant');
    if (folder) {
        console.log('Оптимизация изображений');
        return gulp.src(folder + '/*.{jpg,jpeg,gif,png,svg}')
            .pipe(imagemin({
                progressive: true,
                svgoPlugins: [{
                    removeViewBox: false
                }],
                use: [pngquant()]
            }))
            .pipe(gulp.dest(folder))
    } else {
        console.log('Оптимизация изображений ОТМЕНА: не указана папка')
        callback();
    }
});

// Отправка в GH pages (ветку gh-pages репозитория)
gulp.task('deploy', function () {
    const ghPages = require('gulp-gh-pages');
    console.log('Публикация содержимого ./build/ на GH pages');
    return gulp.src(dirs.buildPath + '**/*')
        .pipe(ghPages());
});

// Основной build
gulp.task('build', function (callback) {
    gulpSequence(
        'clean',        
        ['sprite:svg', 'sprite:png'],
        ['style', 'js', 'copy:css', 'copy:img', 'copy:js', 'copy:fonts'],
        'jade',
        callback
    );
});

gulp.task('default', ['server']);

gulp.task('server', ['build'], function() {    
    browserSync.init({
        server: dirs.build,
        startPath: 'index.html',
        open: true,
        port: 8080
    });

    gulp.watch([
        dirs.source + 'scss/style.scss',
        dirs.source + dirs.blocksName + '/**/*.scss',
        projectConfig.addCssAfter,
        projectConfig.addCssBefore
    ], ['style']);

    if (projectConfig.copiedCss.length) {
        gulp.watch(projectConfig.copiedCss, ['copy:css'])
    }

    if (lists.img.length) {
        gulp.watch(lists.img, ['watch:img']);
    }

    if (projectConfig.copiedJs.length) {
        gulp.watch(projectConfig.copiedJs, ['watch:copied:js']);
    }

    gulp.watch([
        '*.jade',
        '_include/*.jade',
        dirs.blocksName + '/**/*.jade'
    ], {cwd: dirs.source}, ['watch:jade']);

    if (lists.js.length) {
        gulp.watch(lists.js, ['watch:js']);
    };

    if (projectConfig.blocks['sprite-svg'] !== undefined) {
        gulp.watch('*.svg', {cwd: spriteSvgPath}, ['watch:sprite:svg']);
    };

    if (projectConfig.blocks['sprite-png'] !== undefined) {
        gulp.watch('*.png', {cwd: spritePngPath}, ['watch:sprite:png']);
    };
});

gulp.task('watch:img', ['copy:img'], reload);
gulp.task('watch:copied:js', ['copy:js'], reload);
gulp.task('watch:fonts', ['copy:fonts'], reload);
gulp.task('watch:jade', ['jade'], reload);
gulp.task('watch:js', ['js'], reload);
gulp.task('watch:sprite:svg', ['sprite:svg'], reload);
gulp.task('watch:sprite:png', ['sprite:png'], reload);




// Магия от Николая Громова https://github.com/nicothin/NTH-start-project/blob/master/gulpfile.js
// Вдохновение и идеи брались из его репозитория!

function getFilesList(config) {

    let res = {
        'css': [],
        'js': [],
        'img': [],
    };

    // Style
    for (let blockName in config.blocks) {
        res.css.push(config.dirs.source + config.dirs.blocksName + '/' + blockName + '/' + blockName + '.scss');
        if (config.blocks[blockName].length) {
            config.blocks[blockName].forEach(function (elementName) {
                res.css.push(config.dirs.source + config.dirs.blocksName + '/' + blockName + '/' + blockName + elementName + '.scss');
            });
        }
    }
    res.css = res.css.concat(config.addCssAfter);
    res.css = config.addCssBefore.concat(res.css);

    // JS
    for (let blockName in config.blocks) {
        res.js.push(config.dirs.source + config.dirs.blocksName + '/' + blockName + '/' + blockName + '.js');
        if (config.blocks[blockName].length) {
            config.blocks[blockName].forEach(function (elementName) {
                res.js.push(config.dirs.source + config.dirs.blocksName + '/' + blockName + '/' + blockName + elementName + '.js');
            });
        }
    }
    res.js = res.js.concat(config.addJsAfter);    
    res.js = config.addJsBefore.concat(res.js);

    // Images
    for (let blockName in config.blocks) {
        res.img.push(config.dirs.source + config.dirs.blocksName + '/' + blockName + '/img/*.{jpg,jpeg,gif,png,svg}');
    }
    res.img = config.addImg.concat(res.img);    
    return res;
}


// Существование папки
function fileExist(path) {
    const fs = require('fs');
    try {
        fs.statSync(path);
    } catch (err) {
        return !(err && err.code === 'ENOENT');
    }
}

// Перезагрузка браузера
function reload(done) {
    browserSync.reload();
    done();
}