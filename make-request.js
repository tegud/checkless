const AWS = require("aws-sdk"); // eslint-disable-line import/no-extraneous-dependencies
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

function buildTimeoutResult(url, timeout) {
    return {
        success: false,
        url,
        timeout,
        errorMessage: `Timeout after ${timeout}ms from url: ${url}`,
    };
}

function sendSnsEvent(topicArn, subject, message) {
    return new Promise((resolve, reject) => {
        const sns = new AWS.SNS();

        sns.publish({
            Message: JSON.stringify(message),
            Subject: subject,
            TopicArn: topicArn,
        }, (err) => {
            if (err) {
                return reject(new Error(`Failed to send SNS ${err}`));
            }

            return resolve();
        });
    });
}

module.exports.makeRequest = (event, context, callback) => {
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

    return request({
        url,
        headers: {
            "User-Agent": `checkless/1.0 (aws-lambda node-js/${process.version})`,
        },
        timeout,
    }, (err, res) => {
        const end = new Date().valueOf();

        if (err) {
            if (err.code === "ETIMEDOUT" || err.code === "ESOCKETTIMEDOUT") {
                const result = buildTimeoutResult(url, timeout);

                console.log("Request timed out.");

                sendSnsEvent(snsTopicArn, "site-monitor-result", result)
                    .then(() => callback())
                    .catch(error => callback(error));

                return;
            }

            if (err.code === "ECONNREFUSED") {
                sendSnsEvent(snsTopicArn, "site-monitor-result", {
                    success: false,
                    url,
                    timeout,
                    errorMessage: "Could not connect",
                })
                    .then(() => callback())
                    .catch(error => callback(error));

                return;
            }

            sendSnsEvent(snsTopicArn, "site-monitor-result", {
                success: false,
                url,
                timeout,
                errorMessage: err.message || err,
            })
                .then(() => callback())
                .catch(error => callback(error));

            return;
        }

        const result = buildResult(url, res, timeout, end - start);

        sendSnsEvent(snsTopicArn, "site-monitor-result", result)
            .then(() => callback())
            .catch(error => callback(error));
    });
};
