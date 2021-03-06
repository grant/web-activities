/**
 * Copyright 2017 The Web Activities Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const BBPromise = require('bluebird');
const exec = BBPromise.promisify(require('child_process').exec);
const fs = require('fs-extra');
const version = require('./internal-version').VERSION;


/**
 * @param {string} inputFile
 * @return {!Promise}
 */
exports.rollupActivities = function(inputFile, outputFile) {
  mkdirSync('build');
  mkdirSync('dist');
  let js;
  return exec(
      './node_modules/rollup/bin/rollup' +
      ' "' + inputFile + '"' +
      ' --f es' +
      ' --o build/activities-rollup.js'
  ).then(() => {
    js = fs.readFileSync('build/activities-rollup.js', 'utf8');
    // 1. Rearrange one license on top.
    const license = fs.readFileSync(
        'build-system/tasks/license-header.txt', 'utf8').trim();
    while (true) {
      let start = js.indexOf('@license');
      if (start == -1) {
        break;
      }
      for (; start >= 0; start--) {
        if (js.substring(start, start + 2) == '/*') {
          break;
        }
      }
      let end = js.indexOf('*/', start) + 2;
      if (js.substring(end) == '\n') {
        end++;
      }
      js = js.substring(0, start) + js.substring(end);
    }
    js = `${license}\n /** Version: ${version} */\n'use strict';\n${js}`;

    // 2. Strip "Def"
    js = js.replace(/Def/g, '');

    // 3. Replace "$internalRuntimeVersion$".
    js = js.replace(/\$internalRuntimeVersion\$/g, version);

    // 4. Simplify long types.
    js = js.replace(/\.\/activity-types\./g, '');

    return js;
  }).then(js => {
    // Save.
    fs.writeFileSync(outputFile, js);
    // Check some possible issues.
    check(js, /\.\/[^*]/, 'All types must be expanded', outputFile);
  });
};


function check(js, regex, message, file) {
  if (regex.test(js)) {
    throw new Error(file + ': ' + message + ': ' + regex.exec(js)[0]);
  }
}


function mkdirSync(path) {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path);
  }
}
