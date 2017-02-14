:: NOTE: The Lisa's builder requires Node.js with the 'node-sass', 'babel' and
::       'uglify-js' packages

@echo off

:: Check arguments
if "%1" == "sass" goto scss
if "%1" == "es6" goto es6
if "%1" == "watch" goto watch

:: Invalid build argument given
if NOT "%1" == "" echo [ build ] ERROR: Unknown build part (must be 'sass', 'es6' or 'watch')
if NOT "%1" == "" goto end

:scss
:: Console
echo [ build ] Fusionning all SCSS stylesheets...

:: Reset the file
echo. > build\lisa.scss

:: For each source file (JavaScript), bundle it
for %%f in (src\scss\*.scss) do (
  type %%f >> build\lisa.scss
)

:: Transpile to CSS
echo [ build ] Transpiling to CSS...
call node-sass build\lisa.scss --output-style=compressed > build\lisa.min.css

:: End the build if the command-line arguments asked for it
if NOT "%1" == "" goto end

:es6
:: Console
echo [ build ] Fusionning all ES6 scripts...

:: Enable strict mode in the bundle
echo "use strict"; > build\lisa-es6.js
:: Bundle every single file in the 'src\es6' folder
type src\es6\index.js >> build\lisa-es6.js
type src\es6\discuss.js >> build\lisa-es6.js
type src\es6\localdata.js >> build\lisa-es6.js
type src\es6\lis-parser.js >> build\lisa-es6.js

:: Babelify the ES6 bundle to make an ES5 one
:: That extends the game's compatibility with older browsers, with no ES6 support
cd build
echo [ build ] Transpiling to ES5...
:: Transpile the JavaScript ES6 bundle to ES5
call babel lisa-es6.js --out-file lisa-es5.js --presets=es2015
echo [ build ] Minifying...
:: If minifying is not forbidden, do it
if NOT "%2" == "--beautify" uglifyjs --compress --mangle --output lisa.min.js -- lisa-es5.js
:: Else, don't minify the ES5 code
if "%2" == "--beautify" copy lisa-es5.js lisa.min.js

:: Return to the root directory
cd ..

:: End it all
goto end

:: Watch the 'src' folder
:watch
:: Run the Node.js demon
call nodemon --watch src --exec build.bat

:end
:: Done
