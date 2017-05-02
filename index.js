"use strict";

var gutil = require('gulp-util'),
    through = require('through2'),
    pp = require('preprocess'),
    fs = require('fs'),
    crypto = require('crypto');

module.exports = function(options) {
    return through.obj(function (file, encoding, callback) {
        // 流为空则不处理
        if (file.isNull()) {
            gutil.error('file is null');
            return callback(null, file);
        }

        // 插件不支持对 Stream 对直接操作，跑出异常
        if (file.isStream()) {
            gutil.error('Streaming not supported');
            return callback(null, file);
        }

        var content = pp.preprocess(file.contents.toString(), {});

        // 处理CSS
        content = handleContent(content, 'css', options.cssDist);
        // 处理JS
        content = handleContent(content, 'js', options.jsDist);

        file.contents = new Buffer(content);

        // 返回
        this.push(file);
        callback(null, file);
    });
};

function handleContent(content, type, fileDist) {
    var resultArr, result, scriptFile,
        scriptReg = type == 'css' ? /<link[^>]*href=['"]?([^><'"]*)['"]?[^>]*>/g : /<script[^>]*src=['"]?([^><'"]*)['"]?[^>]*>/g,
        fileReg = type == 'css' ? /href=['"](http[s]?)|(\/\/)/ : /src=['"](http[s]?)|(\/\/)/,
        fileSuffix = type == 'css' ? '.css' : '.js';

    while((resultArr = scriptReg.exec(content)) !== null) {
        result = resultArr[1];

        if (result.indexOf(fileSuffix) < 0) {
            continue;
        }

        if (fileReg.test(result)) {
            continue;
        }

        if (result.indexOf('?') > -1) {
            result = result.substr(0, result.indexOf('?'));
        }

        scriptFile = fs.readFileSync(fileDist + result);
        scriptFile.hashValue = genHash(scriptFile);
        content = content.replace(result, result + '?hash=' + scriptFile.hashValue);
        gutil.log(result + '?hash=' + scriptFile.hashValue);
    }

    return content;
}

function genHash(buf) {
    if (!Buffer.isBuffer(buf)) {
        throw new TypeError('Expected a buffer');
    }

    return crypto.createHash('md5').update(buf).digest('hex').slice(0, 12);
}