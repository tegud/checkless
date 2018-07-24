const https = require("https");

const propertyFieldTitles = {
    url: "URL",
    errorMessage: {
        text: "Error",
        short: false,
    },
    timeToFirstByte: {
        text: "Time to First Byte",
        formatter: value => `${value}ms`,
    },
    location: {
        text: "Location",
        formatter: (value, result) => `${value} (${result.region})`,
    },
};

const getField = (property, result) => {
    const current = propertyFieldTitles[property];

    if (typeof (current) === "string") {
        return {
            title: current,
            value: result[property],
            short: true,
        };
    }

    return {
        title: current.text,
        value: current.formatter ? current.formatter(result[property], result) : result[property],
        short: typeof current.short === "undefined" ? true : current.short,
    };
};

module.exports.sendToSlack = (event, context, callback) => {
    const result = JSON.parse(event.Records[0].Sns.Message);
    const slackWebhookPath = process.env.webhookUrl;

    const req = https.request({
        host: "hooks.slack.com",
        path: slackWebhookPath,
        method: "POST",
    }, () => {
        callback();
    });

    console.log(`Sending to slack path: "${slackWebhookPath}", message: "Site check result: ${result.url} (${result.location}) ${result.success ? "was successful" : "failed"}"`);
    console.log(result);

    req.write(JSON.stringify({
        attachments: [{
            fallback: `Site check result: ${result.url}, ${result.region} ${result.success ? "was successful" : "failed"}. ${result.errorMessage}`,
            title: `Site check ${result.url} ${result.success ? "Successful" : "Failed"}.`,
            color: result.success ? "good" : "danger",
            fields: Object.keys(propertyFieldTitles).reduce((fields, currentProperty) => {
                if (!result[currentProperty]) {
                    return fields;
                }

                return [...fields, getField(currentProperty, result)];
            }, []),
        }],
    }));
    req.end();
};
