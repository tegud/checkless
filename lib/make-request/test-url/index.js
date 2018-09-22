const { CheckStatusExpectationError } = require("../../errors");
const { checkUrl } = require("../check-url");
const { lookupLocationFromRegion } = require("../../region-lookup");
const { buildExpectationFromEvent } = require("../build-check-expectation");
const Timer = require("../../timer");

const buildBaseResult = (url, timeout, ttfb, region) => ({
    url,
    timeout,
    timeToFirstByte: ttfb,
    region,
    location: lookupLocationFromRegion(region),
});

function buildResult(url, timeout, ttfb, region, response) {
    const result = {
        ...buildBaseResult(url, timeout, ttfb, region),
        statusCode: response.statusCode,
        success: true,
    };

    return result;
}

const buildResultFromError = (url, timeout, ttfb, region, err) => {
    const baseErrorResponse = {
        success: false,
        ...buildBaseResult(url, timeout, ttfb, region),
    };

    if (err instanceof CheckStatusExpectationError) {
        return {
            ...baseErrorResponse,
            errorMessage: err.message,
            failureReasons: err.failureReasons,
            statusCode: err.actualStatus,
        };
    }

    const errorMessageOverrides = {
        ETIMEDOUT: `Timeout after ${timeout}ms from url: ${url}`,
        EESOCKETTIMEDOUT: `Timeout after ${timeout}ms from url: ${url}`,
        ECONNREFUSED: "Could not connect",
    };

    const failureReasons = ["ETIMEDOUT", "EESOCKETTIMEDOUT"].includes(err.code) ? ["timeout"] : [];

    return {
        ...baseErrorResponse,
        errorMessage: errorMessageOverrides[err.code]
            ? errorMessageOverrides[err.code]
            : err.message || err,
        failureReasons,
    };
};

const testUrl = async ({
    url,
    followRedirect,
    otherOptions,
    timeout,
    region,
    snsTopicArn,
}) => {
    console.log(`Testing url: ${url} from ${region}, with timeout: ${timeout}, SNS ARN: ${snsTopicArn}`);

    const requestTimer = new Timer();

    requestTimer.start();
    try {
        const checkResult = await checkUrl(
            url,
            { timeout, followRedirect },
            buildExpectationFromEvent(otherOptions),
        );

        return buildResult(url, timeout, requestTimer.stop(), region, checkResult);
    } catch (err) {
        return buildResultFromError(url, timeout, requestTimer.stop(), region, err);
    }
};

module.exports = {
    testUrl,
};
