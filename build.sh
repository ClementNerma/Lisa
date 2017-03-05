# NOTE: The Lisa's builder requires Node.js with the 'node-sass', 'babel-cli',
#       'babel-preset-es2015' and 'uglify-js' modules
# NOTE: The 'babel-preset-es2015' module must be installed in the 'node_modules'
#       folder in 'Lisa', if installed globally the builder won't work properly.

# Console
echo [ build ] Fusionning all ES6 scripts...

# Enable strict mode in the bundle
echo \"use strict\"\; > build/lisa-es6.js
# Bundle every single file in the 'src/es6' folder
cat src/es6/core.js >> build/lisa-es6.js
cat src/es6/utils.js >> build/lisa-es6.js
cat src/es6/localdata.js >> build/lisa-es6.js
cat src/es6/web-interface.js >> build/lisa-es6.js
cat src/es6/lis-parser.js >> build/lisa-es6.js

# Babelify the ES6 bundle to make an ES5 one
# That extends the game's compatibility with older browsers, with no ES6 support
cd build
echo [ build ] Transpiling to ES5...
# Transpile the JavaScript ES6 bundle to ES5
babel lisa-es6.js --out-file lisa-es5.js --presets=es2015
# Minifying
echo [ build ] Minifying...
uglifyjs --compress --mangle --output lisa.min.js -- lisa-es5.js

# Go to parent directory
cd ..
# Remove useless files
rm build/lisa-es5.js
rm build/lisa-es6.js
