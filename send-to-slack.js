const { sendToSlack } = require("./lib/slack");
const { buildAttachments } = require("./lib/result-slack-attachment");

module.exports.sendToSlack = async (event, context, callback) => {
    const result = JSON.parse(event.Records[0].Sns.Message);

    const attachments = buildAttachments(result);

    console.log(`Sending to slack, Site check result: ${result.url} (${result.location}) ${result.success ? "was successful" : "failed"}`);
    console.log(result);

    await sendToSlack(attachments);

    callback();
};
