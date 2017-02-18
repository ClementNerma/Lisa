:: NOTE: The Lisa's builder requires Node.js with the 'node-sass', 'babel' and
::       'uglify-js' packages

@echo off

:: If asked for, watch the 'src' folder
:: Run the Node.js demon
if "%1" == "watch" call nodemon --watch src --exec "build.bat %2"
if "%1" == "watch" goto end

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

:: Console
echo [ build ] Fusionning all ES6 scripts...

:: Enable strict mode in the bundle
echo "use strict"; > build\lisa-es6.js
:: Bundle every single file in the 'src\es6' folder
type src\es6\core.js >> build\lisa-es6.js
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
if NOT "%1" == "--beautify" call uglifyjs --compress --mangle --output lisa.min.js -- lisa-es5.js
:: Else, don't minify the ES5 code
if "%1" == "--beautify" copy lisa-es5.js lisa.min.js

:: Return to the root directory
cd ..

:: If asked for, remove sources
if NOT "%1" == "--sources" echo [ build ] Removing sources...
if NOT "%1" == "--sources" del build\lisa-es6.js
if NOT "%1" == "--sources" del build\lisa-es5.js
if NOT "%1" == "--sources" del build\lisa.scss

:end
:: Done
