:: NOTE: The Lisa's builder requires Node.js with the 'node-sass', 'babel' and
::       'babili' packages

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
echo. > build\lisa.fusion.scss

:: For each source file (JavaScript), bundle it
for %%f in (src\scss\*.scss) do (
  type %%f >> build\lisa.fusion.scss
)

:: Transpile to CSS
echo [ build ] Transpiling to CSS...
call node-sass build\lisa.fusion.scss --output-style=compressed > build\lisa.min.css

:: Remove unneeded file
del build\lisa.fusion.scss

:: End the build if the command-line arguments asked for it
if NOT "%1" == "" goto end

:es6
:: Console
echo [ build ] Fusionning all ES6 scripts...

:: Enable strict mode in the bundle
echo "use strict"; > build\lisa.fusion.js
:: Bundle every single file in the 'src\es6' folder
type src\es6\index.js >> build\lisa.fusion.js
type src\es6\lzstring.js >> build\lisa.fusion.js
type src\es6\discuss.js >> build\lisa.fusion.js
type src\es6\localdata.js >> build\lisa.fusion.js

:: Babelify the ES6 bundle to make an ES5 one
:: That extends the game's compatibility with older browsers, with no ES6 support
cd build
echo [ build ] Transpiling to ES5...
:: If minifying is not forbidden, do it
if NOT "%2" == "--beautify" call babel lisa.fusion.js --out-file lisa.min.js --presets=es2015,babili
:: Else, don't minify the ES5 code
if "%2" == "--beautify" call babel lisa.fusion.js --out-file lisa.min.js --presets=es2015

:: Remove unneeded file
del lisa.fusion.js

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
