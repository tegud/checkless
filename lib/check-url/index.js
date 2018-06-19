const request = require("request");

const { CheckStatusExpectationError } = require("../errors");
const { checkResult } = require("./check-result");

const makeRequest = (url, timeout) => new Promise((resolve, reject) => request({
    url,
    headers: {
        "User-Agent": `checkless/1.0 (aws-lambda node-js/${process.version})`,
    },
    timeout,
    time: true,
}, (err, res, body) => {
    if (err) {
        reject(err);
    }

    resolve({ res, body });
}));

module.exports = {
    checkUrl: (url, timeout, expect = { statusCode: 200 }) => makeRequest(url, timeout)
        .then(({ res }) => new Promise((resolve, reject) => {
            if (!checkResult(expect, res)) {
                console.log("Check expectation failed");
                return reject(new CheckStatusExpectationError(expect.statusCode, res.statusCode));
            }

            return resolve(res);
        })),
};
