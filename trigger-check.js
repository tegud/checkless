const Busboy = require("busboy");

const { parseContext } = require("./lib/context");
const { publishToSns } = require("./lib/sns");

const bodyParsers = {
    "application/json": ({ body }) => Promise.resolve(JSON.parse(body)),
};

const formDataParser = ({ headers, body }) => new Promise((resolve, reject) => {
    const contentType = headers["Content-Type"] || headers["content-type"];
    const busboy = new Busboy({ headers: { "content-type": contentType } });
    const completeFormData = {};

    busboy
        .on("field", (fieldname, val) => {
            completeFormData[fieldname] = val;
        })
        .on("finish", () => resolve(completeFormData))
        .on("error", err => reject(err));

    busboy.end(body);
});

const getContentType = (headers) => {
    if (!headers["Content-Type"]) {
        return undefined;
    }

    if (headers["Content-Type"].endsWith("; charset=utf-8")) {
        return headers["Content-Type"].substring(0, headers["Content-Type"].indexOf("; charset=utf-8"));
    }

    return headers["Content-Type"];
};

module.exports.triggerCheck = async (event, context, callback) => {
    const contentType = getContentType(event.headers);
    const bodyParser = bodyParsers[contentType]
        ? bodyParsers[contentType](event)
        : formDataParser(event);

    const parsedData = await bodyParser;
    const { accountId, region } = parseContext(context);
    const sendToRegion = parsedData.region || region;
    const snsTopicArn = `arn:aws:sns:${sendToRegion}:${accountId}:${process.env.makeRequestTopic}`;

    console.log(parsedData);
    console.log(`Send to SNS Topic: ${snsTopicArn}`);

    try {
        await publishToSns(snsTopicArn, "trigger-check", parsedData, sendToRegion);
    } catch (err) {
        return callback(err);
    }

    return callback(null, {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({}),
    });
};
