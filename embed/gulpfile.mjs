'use strict';

import gulp from 'gulp';
import * as dartSass from 'sass';
import gulpSass from 'gulp-sass';
import gif from 'gulp-if';
import jest from 'gulp-jest';
import sourcemaps from 'gulp-sourcemaps';
import cleanCss from 'gulp-clean-css';
import gulpESLintNew from 'gulp-eslint-new';
import webpack from 'webpack-stream';

const sass = gulpSass(dartSass);
const { dest, parallel, src, watch } = gulp;

/** Whether we're running in the production mode (default). */
const isProd = ((process.env.NODE_ENV || 'production').trim().toLowerCase() === 'production');

// Load and tweak Webpack config
import webpackCfgJs from './webpack.config.js';
const webpackConfig = {
    ...webpackCfgJs,
    mode: isProd ? 'production' : 'development',
    devtool: isProd ? undefined : 'eval-source-map',
}

const sources = {
    scss:       './scss/*.scss',
    typescript: './src/**/*.ts',
};

const buildDir = '../build/frontend/';

/** Lint Javascript and Typerscript sources. */
export const lint = () =>
    src(sources.typescript)
        .pipe(gulpESLintNew())
        .pipe(gulpESLintNew.format())
        .pipe(gulpESLintNew.failAfterError());

/** Compile SCSS files into CSS. */
const compileCss = () =>
    src(sources.scss)
        .pipe(gif(!isProd, sourcemaps.init()))
        .pipe(sass({outputStyle: isProd ? 'compressed' : 'expanded'}).on('error', sass.logError))
        // Write out source maps in non-prod mode
        .pipe(gif(!isProd, sourcemaps.write()))
        // Cleanup CSS in prod mode
        .pipe(gif(isProd, cleanCss()))
        .pipe(dest(buildDir));

/** Compile Typescript files. */
const compileTypescript = () =>
    src('./src/index.ts')
        .pipe(webpack(webpackConfig))
        .pipe(dest(buildDir));

/** Run all build tasks in parallel. */
export const build = parallel(compileCss, compileTypescript);

/** Run unit tests. */
export const test = () =>
    src('./src')
        .pipe(jest.default({
            automock: false,
        }));

/** Run unit tests and watch. */
export const testWatch = () =>
    src('./src')
        .pipe(jest.default({
            automock: false,
            watch:    true,
        }));

/** Watch the source tree and rebuild the code on changes. */
export const start = () => {
    build();
    watch(sources.scss,       compileCss);
    watch(sources.typescript, compileTypescript);
}

/** The default is to build. */
export default build;
