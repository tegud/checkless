const request = require("request");

const { CheckStatusExpectationError } = require("./errors");

const makeRequest = (url, timeout) => new Promise((resolve, reject) => request({
    url,
    headers: {
        "User-Agent": `checkless/1.0 (aws-lambda node-js/${process.version})`,
    },
    timeout,
}, (err, res) => {
    if (err) {
        reject(err);
    }

    resolve(res);
}));

module.exports = {
    checkUrl: (url, timeout, expect = { status: 200 }) => makeRequest(url, timeout)
        .then(result => new Promise((resolve, reject) => {
            if (result.statusCode !== expect.status) {
                return reject(new CheckStatusExpectationError(`Error response code ${result.statusCode}`, expect.status, result.statusCode));
            }

            return resolve(result);
        })),
};
