const { publishToSns } = require("./lib/sns");
const request = require("request");

const { parseContext } = require("./lib/context");

function buildResult(url, response, timeout, ttfb) {
    const result = {
        url,
        statusCode: response.statusCode,
        success: response.statusCode === 200,
        timeout,
    };

    if (result.success) {
        result.timeToFirstByte = ttfb;

        return result;
    }

    result.errorMessage = `Error response code ${response.statusCode} from url: ${url}`;

    return result;
}

const buildResultFromError = (err, url, timeout, ttfb) => {
    if (err.code === "ETIMEDOUT" || err.code === "ESOCKETTIMEDOUT") {
        return {
            success: false,
            url,
            timeout,
            errorMessage: `Timeout after ${timeout}ms from url: ${url}`,
        };
    }

    if (err.code === "ECONNREFUSED") {
        return {
            success: false,
            url,
            timeout,
            errorMessage: "Could not connect",
        };
    }

    return {
        success: false,
        url,
        timeout,
        timeToFirstByte: ttfb,
        errorMessage: err.message || err,
    };
};

const checkUrl = (url, timeout) => new Promise((resolve, reject) => request({
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

module.exports.makeRequest = async (event, context, callback) => {
    const { url, region, snsTopic } = event;
    const timeout = event.timeout || 3000;
    const start = new Date().valueOf();

    const { accountId } = parseContext(context);

    const snsTopicArn = `arn:aws:sns:${region}:${accountId}:${snsTopic}`;

    if (!region || !snsTopic) {
        console.log("Region or sns topic not set");
        console.log(JSON.stringify(event, null, 4));
        return callback(new Error("Region or sns topic not set"));
    }

    if (!accountId) {
        console.log("AccountID not set");
        return callback(new Error("AccountID not set"));
    }

    console.log(`Testing url: ${url}, with timeout: ${timeout}, SNS ARN: ${snsTopicArn}`);

    if (!url) {
        console.log(JSON.stringify(event, null, 4));
        console.log("**********************************");
        console.log(JSON.stringify(context, null, 4));
        return callback(new Error("No url provided"));
    }

    let result;

    try {
        const checkResult = await checkUrl(url, timeout);
        const end = new Date().valueOf();

        result = buildResult(url, checkResult, timeout, end - start);
    } catch (err) {
        const end = new Date().valueOf();

        result = buildResultFromError(err, url, timeout, end - start);
    }

    await publishToSns(snsTopicArn, "site-monitor-result", result);

    return callback();
};
