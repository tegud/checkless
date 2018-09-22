const promiseRequest = require("../../promise-request");
const { CheckStatusExpectationError } = require("../../errors");
const { checkResult } = require("./check-result");

const makeRequest = (url, { timeout, followRedirect = false }) => promiseRequest({
    url,
    headers: {
        "User-Agent": `checkless/1.0 (aws-lambda node-js/${process.version})`,
    },
    timeout,
    time: true,
    followRedirect,
});

module.exports = {
    checkUrl: async (url, options, expect = { statusCode: 200 }) => {
        const { res } = await makeRequest(url, options);

        if (!checkResult(expect, res)) {
            console.log("Check expectation failed");
            throw new CheckStatusExpectationError(expect.statusCode, res.statusCode);
        }

        return res;
    },
};
