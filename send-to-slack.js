const https = require("https");

const propertyFieldTitles = {
    url: "URL",
    statusCode: "Status Code",
    errorMessage: "Error",
    timeToFirstByte: {
        text: "Time to First Byte",
        formatter: value => `${value}ms`,
    },
    timeout: "Timeout",
    location: {
        text: "Location",
        formatter: (value, result) => `${value} (${result.region})`,
    },
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

    req.write(JSON.stringify({
        attachments: [{
            fallback: `Site check result: ${result.url} ${result.success ? "was successful" : "failed"}. ${result.errorMessage}`,
            text: `Site check result: ${result.url} ${result.success ? "was successful" : "failed"}.`,
            color: result.success ? "good" : "danger",
            fields: Object.keys(propertyFieldTitles).reduce((fields, currentProperty) => {
                if (!result[currentProperty]) {
                    return fields;
                }

                const current = propertyFieldTitles[currentProperty];

                if (typeof (current) === "string") {
                    fields.push({
                        title: current,
                        value: result[currentProperty],
                        short: true,
                    });
                } else {
                    fields.push({
                        title: current.text,
                        value: current.formatter(result[currentProperty], result),
                        short: true,
                    });
                }

                return fields;
            }, []),
        }],
    }));
    req.end();
};
